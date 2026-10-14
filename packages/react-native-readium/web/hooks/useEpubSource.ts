import { useCallback, useRef } from 'react';
import type { EpubNavigator } from '@readium/navigator';
import type { Publication } from '@readium/shared';
import type { FetchImplementation } from '@readium/shared';

import type {
  ReadiumProps,
  SourceRequestFailure,
} from '../../src/components/ReadiumView.types';
import {
  toPublicationErrorEvent,
  toReadFailureEvent,
} from '../../src/utils/publicationError';
import {
  absolutePublicationURL,
  normalizePublicationURL,
} from '../utils/publicationUtils';
import { createPublicationFetch } from '../utils/publicationFetch';
import {
  createRelocationGuard,
  looksRefreshable,
} from '../utils/relocationGuard';

interface UseEpubSourceProps {
  /** The publication's identity, which is never fetched while resolving. */
  identity: string;
  resolveSource?: ReadiumProps['resolveSource'];
  shouldRefreshSource?: ReadiumProps['shouldRefreshSource'];
  onPublicationError?: ReadiumProps['onPublicationError'];
  /** What is open, if anything; both are needed to re-point a location. */
  navigatorRef: React.MutableRefObject<EpubNavigator | null>;
  publicationRef: React.MutableRefObject<Publication | null>;
}

export interface EpubSource {
  /**
   * Resolves where to open, and records it. Falls back to the identity.
   * Pass `'refresh'` when re-opening after a failure.
   */
  openAt: () => Promise<{ url: string; base: string }>;
  /** Where resources are fetched from, read per request. */
  baseURL: () => string;
  /** The publication's own fetch, which answers its own failures. */
  fetch: FetchImplementation;
}

/**
 * Owns where an open EPUB is read from, and keeps it readable.
 *
 * Separate from the navigator because it is a whole concern of its own:
 * resolving a location, moving the two bases that depend on it, answering a
 * failed request by relocating and retrying, and putting the navigator back
 * together afterwards.
 */
export const useEpubSource = ({
  identity,
  resolveSource,
  shouldRefreshSource,
  onPublicationError,
  navigatorRef,
  publicationRef,
}: UseEpubSourceProps): EpubSource => {
  /** The location in use, and where resources are fetched from. */
  const sourceURLRef = useRef<string | null>(null);
  const baseRef = useRef<string>('');
  /** Read rather than captured, so nothing re-runs when a prop changes. */
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const resolveRef = useRef(resolveSource);
  resolveRef.current = resolveSource;
  const shouldRefreshRef = useRef(shouldRefreshSource);
  shouldRefreshRef.current = shouldRefreshSource;
  const onErrorRef = useRef(onPublicationError);
  onErrorRef.current = onPublicationError;
  /** Decides when a failure earns a new location, and coalesces bursts. */
  const guardRef = useRef(createRelocationGuard());

  const report = useCallback(
    (failure: SourceRequestFailure) => {
      const detail =
        failure.status === undefined
          ? `Could not read '${failure.url}'.`
          : `Could not read '${failure.url}' (status ${failure.status}).`;

      // The publication's own fetch serves the manifest as well as its
      // chapters, so this answers failures from before it existed too. Those
      // are a failure to open, and saying otherwise would tell a consumer the
      // reader is fine when there is no reader.
      onErrorRef.current?.(
        publicationRef.current
          ? toReadFailureEvent(failure, detail)
          : toPublicationErrorEvent({
              url: failure.url,
              code: 'openFailed',
              stage: 'open',
              detail: detail,
            })
      );
    },
    [publicationRef]
  );

  /**
   * Which open is current, so a location resolved for an abandoned one is
   * discarded. A counter rather than the navigator, which does not exist until
   * the open has nearly finished.
   */
  const generationRef = useRef(0);

  /**
   * The opening location. Always `'open'`: a publication is opened once, and
   * a location that stops working afterwards is replaced by `relocate`, which
   * asks with `'refresh'` so a consumer serving `'open'` from a cache cannot
   * hand back the location that just failed.
   */
  const openAt = useCallback(async () => {
    generationRef.current += 1;
    const resolve = resolveRef.current;
    const resolved = resolve
      ? (await resolve({ url: identityRef.current, reason: 'open' })).url
      : identityRef.current;
    // Absolute from here on: the navigator puts this base in each chapter's
    // CSP, which a relative one silently breaks. See `absolutePublicationURL`.
    const url = absolutePublicationURL(resolved);

    sourceURLRef.current = url;
    baseRef.current = normalizePublicationURL(url);
    return { url, base: baseRef.current };
  }, []);

  /**
   * `setSelfLink` moves the frame pool's `baseURL`, the fetcher base moves
   * chapter content. Both, or rebuilt chapters fetch from the old location.
   */
  const relocate = useCallback(async (): Promise<boolean> => {
    const resolve = resolveRef.current;
    if (!resolve) return false;

    const generation = generationRef.current;
    const { url: resolved } = await resolve({
      url: identityRef.current,
      reason: 'refresh',
    });
    if (generation !== generationRef.current) return false; // open abandoned

    const url = absolutePublicationURL(resolved);
    sourceURLRef.current = url;
    baseRef.current = normalizePublicationURL(url);
    // Only once there is a manifest. The open's own requests — the manifest
    // itself, and the first chapters — fail before one exists, and they are
    // answered by moving the fetcher base alone.
    publicationRef.current?.manifest.setSelfLink(url);

    return true;
  }, [publicationRef]);

  /**
   * A rejected chapter fetch leaves `_isNavigating` set, refusing every later
   * page turn — including back to chapters that still work.
   */
  const clearNavigationLatch = useCallback(() => {
    const nav = navigatorRef.current;
    if (!nav) return;

    const latch = nav as unknown as { _isNavigating?: boolean };
    if (latch._isNavigating) latch._isNavigating = false;
  }, [navigatorRef]);

  /** Clear the latch, then rebuild so base and content policy agree. */
  const recoverNavigation = useCallback(() => {
    const nav = navigatorRef.current;
    if (!nav) return;

    clearNavigationLatch();
    nav.go(nav.currentLocator, false, () => {});
  }, [navigatorRef, clearNavigationLatch]);

  /** The location to retry a failed request against, or null. */
  const rebaseForFailure = useCallback(
    (failure: SourceRequestFailure, observedSource: string) => {
      if (!resolveRef.current) return Promise.resolve(false);

      return guardRef.current.answer({
        failure,
        observedSource,
        currentSource: sourceURLRef.current,
        shouldRefresh: shouldRefreshRef.current ?? looksRefreshable,
        report,
        relocate: () =>
          relocate()
            .then((moved) => {
              // Not awaited: the caller has its own retry to get on with.
              if (moved) recoverNavigation();
              return moved;
            })
            .catch((error) => {
              onErrorRef.current?.(
                toReadFailureEvent(
                  failure,
                  `Could not replace the location: ${String(
                    (error as Error)?.message ?? error
                  )}`
                )
              );
              return false;
            }),
      });
    },
    [relocate, recoverNavigation, report]
  );

  const rebaseRef = useRef(rebaseForFailure);
  rebaseRef.current = rebaseForFailure;

  const clearLatchRef = useRef(clearNavigationLatch);
  clearLatchRef.current = clearNavigationLatch;

  const fetchRef = useRef<FetchImplementation | null>(null);
  if (!fetchRef.current) {
    fetchRef.current = createPublicationFetch({
      source: () => sourceURLRef.current ?? '',
      base: () => baseRef.current,
      relocated: (failure: SourceRequestFailure, observedSource: string) =>
        rebaseRef.current(failure, observedSource),
      onSuccess: () => guardRef.current.noteSuccess(),
      // The navigator is about to see this failure, and does not catch it.
      onUnanswered: () => clearLatchRef.current(),
      // A request given up on by the library itself, which no relocation would
      // have fixed, so the guard never hears about it.
      report: (failure) => report(failure),
    });
  }
  const fetch: FetchImplementation = fetchRef.current;

  const baseURL = useCallback(() => baseRef.current, []);

  return { openAt, baseURL, fetch };
};

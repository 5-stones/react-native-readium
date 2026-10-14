import type { FetchImplementation } from '@readium/shared';

import type { SourceRequestFailure } from '../../src/components/ReadiumView.types';

/**
 * How long a request for a publication's bytes may take before it is given up
 * on.
 *
 * A whole duration rather than a stall, because `fetch` has no notion of one:
 * a response that never arrives and one that arrives slowly are the same thing
 * to it. Deliberately generous for that reason — this is here to end a hang,
 * not to police slow connections. The native halves cap a *stall* instead and
 * are tighter; see `ReaderService.swift` and `ReaderService.kt`.
 */
export const SOURCE_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Adds the timeout to a request, keeping whatever signal the caller passed.
 *
 * Both `AbortSignal` statics are guarded: an environment without them gets no
 * timeout, which is how it behaved before. A caller's own signal wins where
 * they cannot be combined, since cancelling a request matters more than
 * bounding it.
 */
const withTimeout = (
  init: RequestInit | undefined,
  timeoutMs: number
): { init?: RequestInit; deadline?: AbortSignal } => {
  if (typeof AbortSignal?.timeout !== 'function') return { init };

  const deadline = AbortSignal.timeout(timeoutMs);
  const caller = init?.signal;
  if (caller && typeof AbortSignal.any !== 'function') return { init };

  return {
    init: {
      ...init,
      signal: caller ? AbortSignal.any([caller, deadline]) : deadline,
    },
    deadline,
  };
};

/** Whether a request failed because something aborted it. */
const isAbort = (error: unknown): boolean =>
  (error as { name?: unknown } | null)?.name === 'AbortError' ||
  (error as { name?: unknown } | null)?.name === 'TimeoutError';

export interface PublicationFetchDeps {
  /** The location in use, read when a request starts. */
  source: () => string;
  /** The directory resources are fetched from, read when a request starts. */
  base: () => string;
  /**
   * Answers a failed request. True once a location is in use that the request
   * can be retried against — read from `base()` afterwards, since a relocation
   * moves it.
   */
  relocated: (
    failure: SourceRequestFailure,
    observedSource: string
  ) => Promise<boolean>;
  /** A request succeeded. */
  onSuccess: () => void;
  /** A failure is being handed back, so whoever asked is about to see it. */
  onUnanswered?: () => void;
  /**
   * A request this gave up on by itself, which no new location would fix, so
   * {@link relocated} is never asked about it. Without this the consumer would
   * hear nothing about a host that stopped answering.
   */
  report?: (failure: SourceRequestFailure) => void;
  /** Defaults to `SOURCE_REQUEST_TIMEOUT_MS`. */
  timeoutMs?: number;
  /** Defaults to `window.fetch`. */
  fetch?: FetchImplementation;
}

/** The url a request was for, whatever shape it arrived in. */
const urlOf = (input: RequestInfo | URL): string =>
  typeof input === 'string'
    ? input
    : input instanceof URL
    ? input.href
    : input.url;

/**
 * A publication's own fetch, which answers its own failures.
 *
 * The navigator catches none of its fetch failures, so letting one through
 * costs the reader the page they were turning to. A failure a new location can
 * fix is retried here instead.
 */
export const createPublicationFetch = ({
  source,
  base,
  relocated,
  onSuccess,
  onUnanswered,
  report,
  timeoutMs = SOURCE_REQUEST_TIMEOUT_MS,
  fetch = window.fetch.bind(window),
}: PublicationFetchDeps): FetchImplementation => {
  return async (input, init) => {
    const observedSource = source();
    const observedBase = base();
    const url = urlOf(input);

    // Kept out of a try/catch that also wraps the retry, so a throwing retry
    // is not mistaken for a fresh failure.
    let response: Response | undefined;
    let thrown: unknown;
    const attempt = withTimeout(init, timeoutMs);
    try {
      response = await fetch(input, attempt.init);
    } catch (error) {
      thrown = error;
    }

    if (response?.ok) {
      onSuccess();
      return response;
    }

    // An abort is not a location that stopped working, and asking for a new
    // one would waste a token refresh and another whole timeout on a host that
    // is simply not answering.
    if (!response && isAbort(thrown)) {
      if (attempt.deadline?.aborted) {
        onUnanswered?.();
        report?.({
          url,
          kind: 'unreadable',
          detail: `No answer within ${timeoutMs} ms.`,
        });
      }

      // A caller's own abort is nobody's news: whoever cancelled the request
      // knows, and the publication may be being torn down.
      throw thrown;
    }

    const failure: SourceRequestFailure = response
      ? { url, status: response.status, kind: 'http' }
      : { url, kind: 'unreadable' };

    const moved = (await relocated(failure, observedSource))
      ? base() !== observedBase
      : false;

    // Nothing to retry against, or this url is not under the directory that
    // moved, so the failure stands.
    if (!moved || !url.startsWith(observedBase)) {
      onUnanswered?.();
      if (response) return response;
      throw thrown;
    }

    const retried = await fetch(
      base() + url.slice(observedBase.length),
      // Its own deadline: a fired timeout signal would abort this immediately.
      withTimeout(init, timeoutMs).init
    );
    if (retried.ok) onSuccess();
    return retried;
  };
};

/**
 * What a thrown pdf.js error says about the request behind it.
 *
 * Its network layer throws a `ResponseException` carrying the status it saw,
 * so unlike a cross-origin `fetch` failure a refused credential is usually
 * classifiable. Anything else is reported as unreadable.
 */
export const failureFromError = (
  url: string,
  error: unknown
): SourceRequestFailure => {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' && status > 0
    ? { url, status, kind: 'http' }
    : { url, kind: 'unreadable' };
};

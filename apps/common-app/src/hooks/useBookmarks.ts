import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Locator } from 'react-native-readium';

import type { Bookmark } from '../types/reader.types';
import { loadBookmarks, saveBookmarks } from '../utils/bookmarkStorage';

const PROGRESSION_EPSILON = 0.0001;

const normalizeFragments = (locator: Locator) =>
  [...(locator.locations?.fragments ?? [])].sort().join('|');

const closeProgression = (a?: number, b?: number) => {
  if (a == null || b == null) return a == null && b == null;
  return Math.abs(a - b) < PROGRESSION_EPSILON;
};

const sameLocation = (a: Locator, b: Locator) =>
  a.href === b.href &&
  a.type === b.type &&
  normalizeFragments(a) === normalizeFragments(b) &&
  (a.locations?.position ?? null) === (b.locations?.position ?? null) &&
  closeProgression(a.locations?.progression, b.locations?.progression) &&
  closeProgression(
    a.locations?.totalProgression,
    b.locations?.totalProgression
  );

const labelFor = (locator: Locator) =>
  locator.title ||
  locator.text?.highlight?.trim() ||
  locator.href.split('/').pop() ||
  locator.href;

const sourceKeyFor = ({
  publicationId,
  epubPath,
  epubUrl,
  bundledAsset,
}: {
  publicationId?: string;
  epubPath?: string;
  epubUrl?: string;
  bundledAsset?: number;
}) =>
  publicationId ||
  epubPath ||
  epubUrl ||
  (bundledAsset != null ? `asset:${bundledAsset}` : 'unknown-publication');

export const useBookmarks = ({
  publicationId,
  epubPath,
  epubUrl,
  bundledAsset,
  initial = [],
}: {
  publicationId?: string;
  epubPath?: string;
  epubUrl?: string;
  bundledAsset?: number;
  initial?: Bookmark[];
}) => {
  const storagePublicationId = useMemo(
    () => sourceKeyFor({ publicationId, epubPath, epubUrl, bundledAsset }),
    [publicationId, epubPath, epubUrl, bundledAsset]
  );
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initial);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const didHydrateRef = useRef(false);
  const skipNextSaveRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    didHydrateRef.current = false;
    setIsLoading(true);
    setError(null);

    loadBookmarks(storagePublicationId)
      .then((stored) => {
        if (cancelled) return;
        setBookmarks(stored);
        didHydrateRef.current = true;
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error('Failed to load bookmarks'));
        setBookmarks(initial);
        skipNextSaveRef.current = true;
        didHydrateRef.current = true;
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [storagePublicationId]);

  useEffect(() => {
    if (!didHydrateRef.current) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    saveBookmarks(storagePublicationId, bookmarks).catch((err) => {
      setError(err instanceof Error ? err : new Error('Failed to save bookmarks'));
    });
  }, [bookmarks, storagePublicationId]);

  const addBookmark = useCallback(
    (locator: Locator) => {
      setBookmarks((prev) => {
        if (prev.some((b) => sameLocation(b.locator, locator))) {
          return prev;
        }

        const now = new Date().toISOString();
        const bookmark: Bookmark = {
          id: `${storagePublicationId}:${now}`,
          publicationId: storagePublicationId,
          locator,
          label: labelFor(locator),
          createdAt: now,
          updatedAt: now,
        };
        return [bookmark, ...prev];
      });
    },
    [storagePublicationId]
  );

  const deleteBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const isBookmarked = useCallback(
    (locator: Locator | undefined) =>
      !!locator && bookmarks.some((b) => sameLocation(b.locator, locator)),
    [bookmarks]
  );

  return {
    bookmarks,
    addBookmark,
    deleteBookmark,
    isBookmarked,
    isLoading,
    error,
  };
};

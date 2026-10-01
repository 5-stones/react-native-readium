import { useState, useCallback, useRef, type RefObject } from 'react';
import { Platform } from 'react-native';

import type { ReadiumViewRef } from '../components/ReadiumView.types';
import type { SearchOptions, SearchResult } from '../interfaces';

// Web has no search service (the web navigator hard-codes `isSupported: false`),
// so it's definitively unsupported. On native, support depends on the
// publication format and is unknown until a search runs, so we assume `true`.
const DEFAULT_IS_SUPPORTED = Platform.OS !== 'web';

export interface UseSearchResult {
  /** The most recent (trimmed) query passed to `search`. */
  query: string;
  /** All results loaded so far, across every page fetched. */
  results: SearchResult[];
  /** True while the first page of a new search is loading. */
  isSearching: boolean;
  /** True while an additional page is loading via `loadMore`. */
  isLoadingMore: boolean;
  /** Whether the current publication supports full-text search. */
  isSupported: boolean;
  /** True while more pages remain; drives infinite scroll / `loadMore`. */
  hasMore: boolean;
  /**
   * Total number of matches, when known. Note this is a running tally that
   * grows as pages are loaded — Readium can rarely report a final total before
   * the whole publication has been searched.
   */
  totalCount?: number;
  /** Starts a new search, replacing any results from a previous one. */
  search: (query: string, options?: SearchOptions) => Promise<void>;
  /** Loads the next page of results for the in-flight search. */
  loadMore: () => Promise<void>;
  /** Clears results and cancels any in-flight search. */
  clear: () => void;
}

/**
 * Drives paginated full-text search for a `ReadiumView`.
 *
 * Pass the same ref you give to `<ReadiumView ref={...} />`. Call `search` to
 * start, `loadMore` (e.g. on a list's `onEndReached`) while `hasMore` is true,
 * and `clear` to reset.
 *
 * The hook serialises page requests internally so a single Readium
 * `SearchIterator` is never advanced concurrently, and ignores responses from a
 * search that has since been superseded or cleared.
 */
export const useSearch = (
  ref: RefObject<ReadiumViewRef | null>
): UseSearchResult => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSupported, setIsSupported] = useState(DEFAULT_IS_SUPPORTED);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);

  // `searchId` lets us ignore responses from a search that has since been
  // superseded or cleared; `loadingRef` prevents overlapping page fetches
  // (a single SearchIterator must not have concurrent next() calls).
  const searchId = useRef(0);
  const loadingRef = useRef(false);

  const search = useCallback(
    async (q: string, options?: SearchOptions) => {
      const trimmed = q.trim();
      setQuery(trimmed);

      const target = ref.current;
      if (!target || !trimmed) return;

      const id = ++searchId.current;
      loadingRef.current = true;
      setIsSearching(true);
      setResults([]);
      setHasMore(false);
      setTotalCount(undefined);
      try {
        const page = await target.search(trimmed, options);
        if (id !== searchId.current) return; // superseded by a newer search
        setResults(page.results);
        setHasMore(page.hasMore);
        setTotalCount(page.totalCount);
        setIsSupported(page.isSupported);
      } catch {
        // The native search rejected (e.g. cancelled on teardown); results were
        // already cleared above, so just stop pagination.
        if (id === searchId.current) setHasMore(false);
      } finally {
        if (id === searchId.current) setIsSearching(false);
        loadingRef.current = false;
      }
    },
    [ref]
  );

  const loadMore = useCallback(async () => {
    const target = ref.current;
    if (!target || loadingRef.current || !hasMore) return;

    const id = searchId.current;
    loadingRef.current = true;
    setIsLoadingMore(true);
    try {
      const page = await target.loadMoreSearchResults();
      if (id !== searchId.current) return; // superseded or cleared
      setResults((prev) => [...prev, ...page.results]);
      setHasMore(page.hasMore);
      if (page.totalCount != null) setTotalCount(page.totalCount);
    } catch {
      // The native page request rejected; keep existing results but stop
      // requesting more.
      if (id === searchId.current) setHasMore(false);
    } finally {
      if (id === searchId.current) setIsLoadingMore(false);
      loadingRef.current = false;
    }
  }, [ref, hasMore]);

  const clear = useCallback(() => {
    searchId.current++; // invalidate any in-flight responses
    loadingRef.current = false;
    ref.current?.cancelSearch();
    setQuery('');
    setResults([]);
    setIsSearching(false);
    setIsLoadingMore(false);
    setHasMore(false);
    setTotalCount(undefined);
    setIsSupported(DEFAULT_IS_SUPPORTED);
  }, [ref]);

  return {
    query,
    results,
    isSearching,
    isLoadingMore,
    isSupported,
    hasMore,
    totalCount,
    search,
    loadMore,
    clear,
  };
};

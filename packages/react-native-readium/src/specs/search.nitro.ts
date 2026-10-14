/**
 * Full-text search, as `ReadiumViewMethods` exposes it.
 *
 * A `.nitro.ts` of its own because nitrogen only loads files named that way:
 * types in a plain module resolve to `any`, and the error says so without
 * naming them.
 */

import type { Locator } from './locator.nitro';

export interface SearchOptions {
  caseSensitive?: boolean;
  diacriticSensitive?: boolean;
  wholeWord?: boolean;
  regularExpression?: boolean;
  language?: string;
}

export interface SearchResult {
  locator: Locator;
  before?: string;
  highlight?: string;
  after?: string;
}

/**
 * A single page of search results, returned by `search()` and
 * `loadMoreSearchResults()`. Results are paginated lazily: keep calling
 * `loadMoreSearchResults()` while `hasMore` is true.
 */
export interface SearchPage {
  /** The matches in this page (may be empty on the terminal page). */
  results: SearchResult[];
  /** True while more pages remain to be fetched via `loadMoreSearchResults()`. */
  hasMore: boolean;
  /** Total number of matches across the whole search, when the service knows it. */
  totalCount?: number;
  /** False when the publication has no search service (e.g. not searchable). */
  isSupported: boolean;
}

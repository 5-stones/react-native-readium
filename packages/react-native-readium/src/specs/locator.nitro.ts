/**
 * Where in a publication something is: positions, bookmarks, highlights,
 * search results and the table of contents all point with these.
 */

// ── Locator ──────────────────────────────────────────────────────────────────

/** Where in its resource a `Locator` points. */
export interface LocatorLocations {
  /** How far into the resource, from 0 to 1. */
  progression?: number;
  /** The position in the publication, counting from 1, as in `positions`. */
  position?: number;
  /** How far into the whole publication, from 0 to 1. */
  totalProgression?: number;
}

/** Text around a location, e.g. a search match in context. */
export interface LocatorText {
  /** The text just before. */
  before?: string;
  /** The text at the location. */
  highlight?: string;
  /** The text just after. */
  after?: string;
}

/**
 * A location in a publication, as Readium describes it: reading positions, bookmarks,
 * highlights and search results are all locators. Store them as they are to reopen there later.
 */
export interface Locator {
  /** The resource (e.g. a chapter's file) within the publication. */
  href: string;
  /** The resource's media type. */
  type: string;
  target?: number;
  title?: string;
  locations?: LocatorLocations;
  text?: LocatorText;
}

// ── Link ─────────────────────────────────────────────────────────────────────

export interface Link {
  href: string;
  title?: string;
  rels?: string[];
  languages?: string[];
  depth?: number;
  hasChildren?: boolean;
  parentHref?: string;
  position?: number;
}

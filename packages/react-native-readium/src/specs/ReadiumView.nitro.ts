import {
  type HybridView,
  type HybridViewProps,
  type HybridViewMethods,
} from 'react-native-nitro-modules';

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

// ── Preferences ──────────────────────────────────────────────────────────────

export interface EpubPreferences {
  backgroundColor?: string;
  columnCount?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  hyphens?: boolean;
  imageFilter?: string;
  language?: string;
  letterSpacing?: number;
  ligatures?: boolean;
  lineHeight?: number;
  pageMargins?: number;
  paragraphIndent?: number;
  paragraphSpacing?: number;
  publisherStyles?: boolean;
  readingProgression?: string;
  scroll?: boolean;
  spread?: string;
  textAlign?: string;
  textColor?: string;
  textNormalization?: boolean;
  theme?: string;
  typeScale?: number;
  verticalText?: boolean;
  wordSpacing?: number;
}

export interface PdfPreferences {
  backgroundColor?: string;
  fit?: string;
  offsetFirstPage?: boolean;
  pageSpacing?: number;
  readingProgression?: string;
  scroll?: boolean;
  scrollAxis?: string;
  spread?: string;
  visibleScrollbar?: boolean;
}

export interface Preferences extends EpubPreferences, PdfPreferences {};

// ── Capabilities ─────────────────────────────────────────────────────────────

/**
 * Something the reader can do with the publication it opened.
 *
 * Every `Preferences` field, plus the abilities that are not preferences.
 */
// export type Capabilities = {
//   [K in keyof Preferences]-?: boolean;
// } & {
//   zoom: boolean;
//   search: boolean;
//   decorations: boolean;
//   selection: boolean;
// };

export type Capabilities = {
  backgroundColor: boolean;
  columnCount: boolean;
  fontFamily: boolean;
  fontSize: boolean;
  fontWeight: boolean;
  hyphens: boolean;
  imageFilter: boolean;
  language: boolean;
  letterSpacing: boolean;
  ligatures: boolean;
  lineHeight: boolean;
  pageMargins: boolean;
  paragraphIndent: boolean;
  paragraphSpacing: boolean;
  publisherStyles: boolean;
  readingProgression: boolean;
  scroll: boolean;
  spread: boolean;
  textAlign: boolean;
  textColor: boolean;
  textNormalization: boolean;
  theme: boolean;
  typeScale: boolean;
  verticalText: boolean;
  wordSpacing: boolean;

  fit: boolean;
  offsetFirstPage: boolean;
  pageSpacing: boolean;
  scrollAxis: boolean;
  visibleScrollbar: boolean;

  zoom: boolean;
  search: boolean;
  decorations: boolean;
  selection: boolean;
};


// ── Decoration ───────────────────────────────────────────────────────────────

/** How a decoration looks. */
export interface DecorationStyle {
  /** `'highlight'` or `'underline'`. */
  type: string;
  /** Its color, as a CSS color. */
  tint?: string;
  isActive?: boolean;
  id?: string;
  html?: string;
  css?: string;
  layout?: string;
  width?: string;
}

/** One annotation rendered over the publication, such as a highlight. */
export interface Decoration {
  /** Your identifier for it, unique within its group. */
  id: string;
  /** Where it is. */
  locator: Locator;
  /** How it looks. */
  style: DecorationStyle;
  /** Your own data, such as a note or the selected text. */
  extras?: Record<string, string>;
}

/** A named set of decorations, such as `"highlights"`. */
export interface DecorationGroup {
  name: string;
  decorations: Decoration[];
}

// ── Rect / Point ─────────────────────────────────────────────────────────────

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

// ── Selection ────────────────────────────────────────────────────────────────

/** An item added to the text-selection menu. */
export interface SelectionAction {
  /** Reported as `actionId` when the user picks it. */
  id: string;
  /** The menu item's text. */
  label: string;
}

// ── Publication Metadata ─────────────────────────────────────────────────────

export interface Contributor {
  name: string;
  sortAs?: string;
  identifier?: string;
  role?: string;
  position?: number;
}

export interface Subject {
  name: string;
  sortAs?: string;
  code?: string;
  scheme?: string;
}

export interface SeriesInfo {
  name: string;
  position?: number;
}

export interface BelongsTo {
  series?: SeriesInfo[];
  collection?: SeriesInfo[];
}

export interface AccessibilityCertification {
  certifiedBy?: string;
  credential?: string;
  report?: string;
}

export interface Accessibility {
  conformsTo?: string[];
  certification?: AccessibilityCertification;
  accessMode?: string[];
  accessModeSufficient?: string[];
  feature?: string[];
  hazard?: string[];
  summary?: string;
}

export interface PublicationMetadata {
  title: string;
  sortAs?: string;
  subtitle?: string;
  identifier?: string;
  conformsTo?: string[];
  accessibility?: Accessibility;
  modified?: string;
  published?: string;
  language?: string[];
  author?: Contributor[];
  translator?: Contributor[];
  editor?: Contributor[];
  artist?: Contributor[];
  illustrator?: Contributor[];
  letterer?: Contributor[];
  penciler?: Contributor[];
  colorist?: Contributor[];
  inker?: Contributor[];
  narrator?: Contributor[];
  contributor?: Contributor[];
  publisher?: Contributor[];
  imprint?: Contributor[];
  subject?: Subject[];
  layout?: string;
  readingProgression?: string;
  description?: string;
  duration?: number;
  numberOfPages?: number;
  belongsTo?: BelongsTo;
}

// ── Search ────────────────────────────────────────────────────────────────────

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

// ── Events ───────────────────────────────────────────────────────────────────

/** Reported by `onPublicationReady` once a publication opens. */
export interface PublicationReadyEvent {
  /** The table of contents, nested through each link's `children`. */
  tableOfContents: Link[];
  /** One locator per position in the publication, e.g. for a page slider. */
  positions: Locator[];
  /** Title, authors, language and more. */
  metadata: PublicationMetadata;
  /** Which preferences and features apply to this publication. */
  capabilities: Capabilities;
  /** True when a registered content protection unlocked this publication. */
  isProtected: boolean;
  /** The protection's scheme URI, e.g. `http://readium.org/2014/01/lcp`. */
  protectionScheme?: string;
}

/**
 * Why a publication could not be opened.
 * - `protectionNotSupported`: protected with a scheme no registered content protection handles.
 * - `restricted`: a protection matched but refused access, e.g. an expired license.
 * - `cancelled`: restricted with no error, e.g. the passphrase prompt was dismissed.
 */
export type PublicationErrorCode =
  | 'fileNotFound'
  | 'formatNotSupported'
  | 'openFailed'
  | 'protectionNotSupported'
  | 'restricted'
  | 'cancelled';

/**
 * The publication could not be opened, as native reports it. JS turns it into the public
 * `PublicationErrorEvent` (src/interfaces/PublicationError.ts).
 */
export interface PublicationErrorEvent {
  /** The `file.url` whose open failed. */
  url: string;
  /** Why, the same on every platform: branch on it, or map it to your own localized text. */
  code: PublicationErrorCode;
  /** The platform's own description; becomes the public event's `detail`. */
  message: string;
  /** For a protected publication, its DRM scheme's URI. */
  protectionScheme?: string;
}

/** Reported by `onPreferencesChanged` once preferences are applied. */
export interface PreferencesChangedEvent {
  /** Which preferences and features apply now. */
  capabilities: Capabilities;
}

/** Reported by `onDecorationActivated` when the user taps a decoration. */
export interface DecorationActivatedEvent {
  /** The decoration tapped. */
  decoration: Decoration;
  /** The name of its group. */
  group: string;
  rect?: Rect;
  point?: Point;
}

/** Reported by `onSelectionChange` as the user adjusts a selection. */
export interface SelectionEvent {
  /** Where the selection is; undefined once it's cleared. */
  locator?: Locator;
  selectedText?: string;
}

/** Reported by `onSelectionAction` when the user picks one of the `selectionActions`. */
export interface SelectionActionEvent {
  /** Where the selection is, e.g. to create a highlight there. */
  locator: Locator;
  selectedText: string;
  /** The `id` of the action picked. */
  actionId: string;
}

// ── File ─────────────────────────────────────────────────────────────────────

/** The publication a `ReadiumView` opens. */
export interface ReadiumFile {
  /**
   * iOS and Android: a local path or `file://` URL to an EPUB or PDF. Web: the URL of an unpacked
   * EPUB's `manifest.json`, or of a PDF.
   */
  url: string;
  /** Where to start reading, e.g. a locator saved from `onLocationChange`. */
  initialLocation?: Locator;
  /**
   * Handed to the registered content protections when the publication is opened, e.g. an LCP
   * passphrase or its SHA-256 hex hash. Ignored by unprotected publications and on web.
   */
  credentials?: string;
}

// ── HybridView ───────────────────────────────────────────────────────────────

export interface ReadiumViewProps extends HybridViewProps {
  file?: ReadiumFile;
  preferences?: Preferences;
  decorations?: DecorationGroup[];
  selectionActions?: SelectionAction[];
  onLocationChange?: (locator: Locator) => void;
  onPublicationReady?: (event: PublicationReadyEvent) => void;
  onPreferencesChanged?: (event: PreferencesChangedEvent) => void;
  onPublicationError?: (event: PublicationErrorEvent) => void;
  onDecorationActivated?: (event: DecorationActivatedEvent) => void;
  onSelectionChange?: (event: SelectionEvent) => void;
  onSelectionAction?: (event: SelectionActionEvent) => void;
}

export interface ReadiumViewMethods extends HybridViewMethods {
  goTo(locator: Locator): void;
  goForward(): void;
  goBackward(): void;
  destroy(): void;
  /** Starts a new full-text search and resolves with the first page of results. */
  search(query: string, options?: SearchOptions): Promise<SearchPage>;
  /** Resolves with the next page of results for the in-flight search. */
  loadMoreSearchResults(): Promise<SearchPage>;
  /** Cancels the in-flight search and releases the iterator. */
  cancelSearch(): void;
}

export type ReadiumView = HybridView<ReadiumViewProps, ReadiumViewMethods>;

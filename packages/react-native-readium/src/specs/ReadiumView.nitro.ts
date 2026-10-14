/**
 * The `ReadiumView` itself: what it takes, what it reports and what it can be
 * told to do.
 *
 * The vocabulary it speaks in is declared beside it — one file per concern,
 * each a `.nitro.ts`, because nitrogen only loads files named that way.
 */

import {
  type HybridView,
  type HybridViewProps,
  type HybridViewMethods,
} from 'react-native-nitro-modules';
import type {
  DecorationActivatedEvent,
  DecorationGroup,
} from './decorations.nitro';
import type { PublicationErrorEvent } from './errors.nitro';
import type { Link, Locator } from './locator.nitro';
import type { PublicationMetadata } from './metadata.nitro';
import type {
  Capabilities,
  Preferences,
  PreferencesChangedEvent,
} from './preferences.nitro';
import type { SearchOptions, SearchPage } from './search.nitro';
import type {
  SelectionAction,
  SelectionActionEvent,
  SelectionEvent,
} from './selection.nitro';
import type {
  PublicationSource,
  ResolveSourceRequest,
  SourceRequestFailure,
} from './source.nitro';

// ── Events ───────────────────────────────────────────────────────────────────

/** Reported by `onPublicationReady` once a publication opens. */
export interface PublicationReadyEvent {
  /**
   * The table of contents, flat, each link carrying where it sits in the tree.
   *
   * Flat because a nested one would need `Link` to reference itself, which
   * nitrogen cannot generate. JS rebuilds the tree before a consumer sees it
   * (src/utils/buildLinkTree.ts).
   */
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
 * Reports the reader's magnification, including changes the reader makes with
 * a pinch or a double tap rather than through `setZoom`.
 *
 * `scale` is relative to the fitted page — 1 means one page sized to the
 * viewport — rather than being a raw platform scale factor, which would depend
 * on the page's own dimensions and so mean something different in every
 * publication (and, in a scanned one, on every page).
 */
export interface ZoomEvent {
  /** Current magnification, where 1 is the page fitted to the reader. */
  scale: number;
  /** Smallest `scale` the current layout allows. */
  min: number;
  /** Largest `scale` the current layout allows. */
  max: number;
}

// ── File ─────────────────────────────────────────────────────────────────────

/** The publication a `ReadiumView` opens. */
export interface ReadiumFile {
  /**
   * Where the publication is.
   *
   * iOS and Android take either an `http(s)://` URL, read over the network as
   * the reader turns pages, or a local path or `file://` URL to a file you
   * downloaded yourself. Web takes the URL of an unpacked EPUB's
   * `manifest.json`, or of a PDF.
   *
   * With `resolveSource` set this is the publication's identity rather than
   * somewhere to fetch from, and is never fetched.
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

/**
 * What a `ReadiumView` takes, and the definition the public `ReadiumProps`
 * (src/components/ReadiumView.types.ts) is built from: everything a consumer
 * passes straight through to the view is declared here once, and that file
 * names only what it adds or changes.
 */
export interface ReadiumViewProps extends HybridViewProps {
  /**
   * The publication to open, and where to start. Setting a different `url` opens that
   * publication in the same view.
   */
  file?: ReadiumFile;
  /**
   * How the reader lays out and styles the publication: theme, font size, margins, …. Readium's
   * defaults apply to anything left out. Check `capabilities` for what applies.
   */
  preferences?: Preferences;
  /** Highlights and underlines to render, in named groups. */
  decorations?: DecorationGroup[];
  /**
   * Items added to the text-selection menu; picking one fires
   * `onSelectionAction`.
   *
   * The menu is the operating system's on iOS and Android. A browser has
   * none, so on web the library draws one beside the selection, with these
   * same items.
   */
  selectionActions?: SelectionAction[];
  /** The reading position changed, e.g. the user turned a page. Save it to reopen there. */
  onLocationChange?: (locator: Locator) => void;
  /**
   * The publication opened: its metadata, table of contents, positions and
   * capabilities. The public event's table of contents is nested; this one is
   * flat, with each link's place in the tree on it.
   */
  onPublicationReady?: (event: PublicationReadyEvent) => void;
  /** Preferences were applied; reports which ones now apply. */
  onPreferencesChanged?: (event: PreferencesChangedEvent) => void;
  /**
   * Something went wrong with the publication; `code` says what and `stage`
   * says how bad. The public event adds the `message` that goes with `code`.
   */
  onPublicationError?: (event: PublicationErrorEvent) => void;
  /**
   * Whether a failed request should prompt a new location from
   * `resolveSource`.
   *
   * Left unset, the platform decides, and the default is the shapes a
   * credential that has expired or been refused takes: a 401 or a 403 on every
   * platform, and on web also an `unreadable` failure, which exists because a
   * cross-origin error response withholds its status. Native always has the
   * status, so it has no equivalent.
   *
   * Return false to let the failure stand. It is then reported through
   * `onPublicationError` with `stage: 'read'`, on every platform, so a
   * consumer can offer a retry rather than leaving a page quietly missing.
   *
   * Worth overriding where those statuses mean something else: a host that
   * answers 403 for "not permitted" rather than "credential stale" gains
   * nothing from a new location, and a host that signals expiry with a 404 or
   * a 400 would otherwise never be refreshed at all.
   *
   * Always asynchronous, even where the answer is a comparison: native cannot
   * wait on the JS thread for a value, so an answer always arrives as a
   * promise.
   *
   * A location that keeps failing is not asked for again indefinitely: two
   * relocations without a request succeeding in between, and ten seconds for
   * this and `resolveSource` together to answer a failure before it is left to
   * stand. Only one failure is answered at a time, so a predicate that never
   * settles would otherwise hold back every later one.
   *
   * Requires `resolveSource`. On iOS and Android, leaving it unset means an
   * ordinary expiry never crosses the bridge to be classified; setting it
   * costs a round trip per failed read.
   */
  shouldRefreshSource?: (failure: SourceRequestFailure) => Promise<boolean>;
  /**
   * Where to read `file` from, when that is not `file.url` itself — a signed
   * url, say, which `file.url` should not be because it expires.
   *
   * `file.url` remains the publication's identity: it decides when a different
   * publication has been opened and keys the positions you save, and it is not
   * fetched while this is set. This supplies only the location, and is asked
   * again whenever a request fails, without the publication being treated as
   * a new one.
   *
   * Called before the first open and on each refresh — never per request. The
   * request says which publication, and whether this is the first location or
   * a replacement.
   *
   * Answering a failed request is on a ten second deadline, shared with
   * `shouldRefreshSource`; past it the failure stands. Resolving with an empty
   * url, or rejecting, declines.
   */
  resolveSource?: (request: ResolveSourceRequest) => Promise<PublicationSource>;
  /** The user tapped a decoration, e.g. a highlight. */
  onDecorationActivated?: (event: DecorationActivatedEvent) => void;
  /** The text selection changed, as the user adjusts it. */
  onSelectionChange?: (event: SelectionEvent) => void;
  /** The user picked one of the `selectionActions`. */
  onSelectionAction?: (event: SelectionActionEvent) => void;
  /**
   * A PDF's magnification changed, including by a pinch.
   *
   * Web only, and declared here anyway so that the view has one definition:
   * iOS and Android hand a PDF to PDFKit and AndroidPdfViewer, both of which
   * zoom by themselves and report nothing back, so there is nothing for them
   * to relay.
   */
  onZoomChange?: (event: ZoomEvent) => void;
}

/**
 * What a `ReadiumView` can be told to do, and the definition the public
 * `ReadiumViewRef` (src/components/ReadiumView.types.ts) is built from.
 *
 * Everything here is a consumer's to call except `destroy`, which is the
 * component's own teardown.
 */
export interface ReadiumViewMethods extends HybridViewMethods {
  /** Goes to a location: a chapter, a bookmark, a search result or one of the `positions`. */
  goTo(locator: Locator): void;
  /** Goes to the next page. */
  goForward(): void;
  /** Goes to the previous page. */
  goBackward(): void;
  /**
   * Releases the publication and everything showing it.
   *
   * The component's own, called when it unmounts — which is why the public ref
   * leaves it out: a consumer unmounts the view instead.
   */
  destroy(): void;
  /**
   * Starts a new full-text search and resolves with the first page of results.
   * Most apps should use `useSearch` instead.
   *
   * @platform iOS, Android. On web, resolves a page with `isSupported: false`.
   */
  search(query: string, options?: SearchOptions): Promise<SearchPage>;
  /**
   * Resolves with the next page of results for the in-flight search. Wait for
   * each page before asking for the next: a search cannot be advanced
   * concurrently.
   */
  loadMoreSearchResults(): Promise<SearchPage>;
  /** Cancels the in-flight search and releases the iterator. */
  cancelSearch(): void;
  /**
   * Magnifies a PDF one step.
   *
   * @platform web. iOS and Android hand a PDF to PDFKit and AndroidPdfViewer,
   * which own their own magnification, so this does nothing there.
   */
  zoomIn(): void;
  /**
   * Reduces a PDF's magnification one step.
   *
   * @platform web. Does nothing on iOS and Android; see `zoomIn`.
   */
  zoomOut(): void;
  /**
   * Sets a PDF's magnification, where 1 is the page fitted to the view.
   *
   * @platform web. Does nothing on iOS and Android; see `zoomIn`.
   */
  setZoom(scale: number): void;
  /**
   * Fits the PDF's page to the view again.
   *
   * @platform web. Does nothing on iOS and Android; see `zoomIn`.
   */
  resetZoom(): void;
}

export type ReadiumView = HybridView<ReadiumViewProps, ReadiumViewMethods>;

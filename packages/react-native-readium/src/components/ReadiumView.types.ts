import type {
  Preferences,
  Locator,
  File,
  DecorationGroup,
  SelectionAction,
  PublicationReadyEvent,
  PublicationErrorEvent,
  DecorationActivatedEvent,
  SelectionEvent,
  SelectionActionEvent,
  SearchOptions,
  SearchPage,
  ZoomEvent,
  PreferencesChangedEvent,
} from '../interfaces';

/**
 * Moves the reader, searches and zooms; get it with a ref on {@link ReadiumView}.
 *
 * @example
 * ```tsx
 * const ref = useRef<ReadiumViewRef>(null);
 * <ReadiumView ref={ref} file={file} />;
 * ref.current?.goForward();
 * ```
 *
 * @interface
 * @group Components
 */
export type ReadiumViewRef = {
  /** Goes to a location: a chapter, a bookmark, a search result or one of the `positions`. */
  goTo: (locator: Locator) => void;
  /** Goes to the next page. */
  goForward: () => void;
  /** Goes to the previous page. */
  goBackward: () => void;
  /**
   * Starts a new search and resolves with the first page of results. Most apps should use
   * {@link useSearch} instead.
   * @platform iOS, Android. On web, resolves a page with `isSupported: false`.
   */
  search: (query: string, options?: SearchOptions) => Promise<SearchPage>;
  /**
   * Resolves with the next page of results for the current search. Wait for each page before
   * asking for the next: a search can't be advanced concurrently.
   */
  loadMoreSearchResults: () => Promise<SearchPage>;
  /** Cancels the current search and releases it. */
  cancelSearch: () => void;
  /** Magnifies a PDF one step. */
  zoomIn: () => void;
  /** Reduces a PDF's magnification one step. */
  zoomOut: () => void;
  /** Sets a PDF's magnification, where 1 is the page fitted to the view. */
  setZoom: (scale: number) => void;
  /** Fits the PDF's page to the view again. */
  resetZoom: () => void;
};

/**
 * The props of {@link ReadiumView}.
 *
 * @interface
 * @group Components
 */
export type ReadiumProps = {
  /**
   * The publication to open, and where to start. Setting a different `url` opens that
   * publication in the same view.
   */
  file: File;
  /**
   * How the reader lays out and styles the publication: theme, font size, margins, …. Readium's
   * defaults apply to anything left out. Check `capabilities` for what applies.
   */
  preferences?: Preferences;
  /** Highlights and underlines to render, in named groups. */
  decorations?: DecorationGroup[];
  /** Items added to the text-selection menu; picking one fires `onSelectionAction`. */
  selectionActions?: SelectionAction[];
  /** The view's style. */
  style?: any;
  /** The reading position changed, e.g. the user turned a page. Save it to reopen there. */
  onLocationChange?: (locator: Locator) => void;
  /** The publication opened: its metadata, table of contents, positions and capabilities. */
  onPublicationReady?: (event: PublicationReadyEvent) => void;
  /** Preferences were applied; reports which ones now apply. */
  onPreferencesChanged?: (event: PreferencesChangedEvent) => void;
  /** The publication couldn't be opened; `code` says why. Fires instead of `onPublicationReady`. */
  onPublicationError?: (event: PublicationErrorEvent) => void;
  /** The user tapped a decoration, e.g. a highlight. */
  onDecorationActivated?: (event: DecorationActivatedEvent) => void;
  /** The text selection changed, as the user adjusts it. */
  onSelectionChange?: (event: SelectionEvent) => void;
  /** The user picked one of the `selectionActions`. */
  onSelectionAction?: (event: SelectionActionEvent) => void;
  /**
   * A PDF's magnification changed, including by a pinch.
   * @platform web. The native PDF viewers zoom by themselves and report nothing.
   */
  onZoomChange?: (event: ZoomEvent) => void;
};

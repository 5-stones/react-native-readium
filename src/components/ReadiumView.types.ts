import type {
  Preferences,
  Locator,
  File,
  DecorationGroup,
  SelectionAction,
  PublicationReadyEvent,
  DecorationActivatedEvent,
  SelectionEvent,
  SelectionActionEvent,
  SearchOptions,
  SearchPage,
} from '../interfaces';

export type ReadiumViewRef = {
  goTo: (locator: Locator) => void;
  goForward: () => void;
  goBackward: () => void;
  /** Starts a new search and resolves with the first page of results. */
  search: (query: string, options?: SearchOptions) => Promise<SearchPage>;
  /** Resolves with the next page of results for the in-flight search. */
  loadMoreSearchResults: () => Promise<SearchPage>;
  /** Cancels the in-flight search and releases the iterator. */
  cancelSearch: () => void;
};

export type ReadiumProps = {
  file: File;
  preferences: Preferences;
  decorations?: DecorationGroup[];
  selectionActions?: SelectionAction[];
  style?: any;
  onLocationChange?: (locator: Locator) => void;
  onPublicationReady?: (event: PublicationReadyEvent) => void;
  onDecorationActivated?: (event: DecorationActivatedEvent) => void;
  onSelectionChange?: (event: SelectionEvent) => void;
  onSelectionAction?: (event: SelectionActionEvent) => void;
};

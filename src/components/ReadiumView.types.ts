import type {
  Preferences,
  Locator,
  File,
  DecorationGroup,
  SelectionAction,
  PublicationReadyEvent,
  Link,
  DecorationActivatedEvent,
  SelectionEvent,
  SelectionActionEvent,
  PublicationInfo,
  ReadiumError,
  UnsupportedCapabilityEvent,
  SearchProgressEvent,
  MediaState,
  SearchOptions,
  SearchResult,
  ResourceResponse,
  PdfPreferences,
  ComicPreferences,
  AudioPreferences,
} from '../interfaces';

export type ReadiumViewRef = {
  goTo: (locator: Locator) => void;
  goForward: () => void;
  goBackward: () => void;
  getPublication: () => Promise<PublicationInfo>;
  getCurrentLocation: () => Promise<Locator>;
  getCurrentSelection: () => Promise<SelectionEvent>;
  clearSelection: () => void;
  setSelection: (locator: Locator) => Promise<boolean>;
  search: (query: string, options?: SearchOptions) => Promise<SearchResult[]>;
  cancelSearch: () => void;
  getResource: (href: string) => Promise<ResourceResponse>;
  getPositions: () => Promise<Locator[]>;
  getTableOfContents: () => Promise<Link[]>;
  setPreferences: (preferences: Preferences) => void;
  setPdfPreferences: (preferences: PdfPreferences) => void;
  setComicPreferences: (preferences: ComicPreferences) => void;
  setAudioPreferences: (preferences: AudioPreferences) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (position: number) => void;
  skipToNext: () => void;
  skipToPrevious: () => void;
  setPlaybackRate: (rate: number) => void;
  getMediaState: () => Promise<MediaState>;
};

export type ReadiumProps = {
  file: File;
  preferences: Preferences;
  decorations?: DecorationGroup[];
  selectionActions?: SelectionAction[];
  style?: any;
  onLocationChange?: (locator: Locator) => void;
  onPublicationReady?: (event: PublicationReadyEvent) => void;
  onReady?: (event: PublicationInfo) => void;
  onError?: (error: ReadiumError) => void;
  onUnsupportedCapability?: (event: UnsupportedCapabilityEvent) => void;
  onSearchProgress?: (event: SearchProgressEvent) => void;
  onDecorationActivated?: (event: DecorationActivatedEvent) => void;
  onSelectionChange?: (event: SelectionEvent) => void;
  onSelectionAction?: (event: SelectionActionEvent) => void;
  onMediaStateChange?: (state: MediaState) => void;
  onMediaError?: (error: ReadiumError) => void;
};

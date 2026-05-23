import {
  type HybridView,
  type HybridViewProps,
  type HybridViewMethods,
} from 'react-native-nitro-modules';

// ── Locator ──────────────────────────────────────────────────────────────────

export interface LocatorLocations {
  fragments?: string[];
  progression: number;
  position?: number;
  totalProgression?: number;
}

export interface LocatorText {
  before?: string;
  highlight?: string;
  after?: string;
}

export interface Locator {
  href: string;
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
  type?: string;
  rels?: string[];
  languages?: string[];
  depth?: number;
  hasChildren?: boolean;
  parentHref?: string;
  position?: number;
  duration?: number;
}

// ── Preferences ──────────────────────────────────────────────────────────────

export interface Preferences {
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
  merging?: boolean;
}

// ── Format-specific Preferences ─────────────────────────────────────────────

export interface PdfPreferences {
  readingProgression?: string;
  scroll?: boolean;
  spread?: string;
  fit?: string;
  offsetFirstPage?: boolean;
}

export interface ComicPreferences {
  readingProgression?: string;
  spread?: string;
  fit?: string;
  offsetFirstPage?: boolean;
}

export interface AudioPreferences {
  speed?: number;
  volume?: number;
}

// ── Decoration ───────────────────────────────────────────────────────────────

export interface DecorationStyle {
  type: string;
  tint?: string;
  isActive?: boolean;
  id?: string;
  html?: string;
  css?: string;
  layout?: string;
  width?: string;
}

export interface Decoration {
  id: string;
  locator: Locator;
  style: DecorationStyle;
  extras?: Record<string, string>;
}

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

export interface SelectionAction {
  id: string;
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

// ── Publication / Capabilities ───────────────────────────────────────────────

export interface PublicationCapabilities {
  locations: boolean;
  tableOfContents: boolean;
  positions: boolean;
  preferences: boolean;
  decorations: boolean;
  selection: boolean;
  search: boolean;
  resources: boolean;
  mediaPlayback: boolean;
  mediaOverlays: boolean;
  tts: boolean;
}

export interface PublicationInfo {
  format: string;
  capabilities: PublicationCapabilities;
  tableOfContents: Link[];
  readingOrder: Link[];
  resources: Link[];
  positions: Locator[];
  metadata: PublicationMetadata;
}

export interface ReadiumError {
  code: string;
  message: string;
  capability?: string;
  format?: string;
  details?: string;
}

export interface SearchOptions {
  caseSensitive?: boolean;
  diacriticSensitive?: boolean;
  wholeWord?: boolean;
  exact?: boolean;
  language?: string;
  regularExpression?: boolean;
  limit?: number;
}

export interface SearchResult {
  locator: Locator;
  title?: string;
  snippet?: string;
  index: number;
}

export interface ResourceResponse {
  href: string;
  mediaType?: string;
  length?: number;
  base64: string;
}

export interface MediaTrack {
  index: number;
  href: string;
  title?: string;
  duration?: number;
  mediaType?: string;
}

export interface MediaState {
  state: string;
  resourceIndex: number;
  position: number;
  duration?: number;
  totalDuration?: number;
  playbackRate: number;
  track?: MediaTrack;
}

// ── Events ───────────────────────────────────────────────────────────────────

export interface PublicationReadyEvent {
  tableOfContents: Link[];
  positions: Locator[];
  metadata: PublicationMetadata;
  format?: string;
  capabilities?: PublicationCapabilities;
  readingOrder?: Link[];
  resources?: Link[];
}

export interface DecorationActivatedEvent {
  decoration: Decoration;
  group: string;
  rect?: Rect;
  point?: Point;
}

export interface SelectionEvent {
  locator?: Locator;
  selectedText?: string;
}

export interface SelectionActionEvent {
  locator: Locator;
  selectedText: string;
  actionId: string;
}

export interface UnsupportedCapabilityEvent {
  capability: string;
  format?: string;
  message: string;
}

export interface SearchProgressEvent {
  query: string;
  resultCount?: number;
  isComplete: boolean;
}

// ── File ─────────────────────────────────────────────────────────────────────

export interface ReadiumFile {
  url: string;
  mediaType?: string;
  formatHint?: string;
  initialLocation?: Locator;
}

// ── HybridView ───────────────────────────────────────────────────────────────

export interface ReadiumViewProps extends HybridViewProps {
  file?: ReadiumFile;
  preferences?: Preferences;
  decorations?: DecorationGroup[];
  selectionActions?: SelectionAction[];
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
}

export interface ReadiumViewMethods extends HybridViewMethods {
  goTo(locator: Locator): void;
  goForward(): void;
  goBackward(): void;
  destroy(): void;
  getPublication(): Promise<PublicationInfo>;
  getCurrentLocation(): Promise<Locator>;
  getCurrentSelection(): Promise<SelectionEvent>;
  clearSelection(): void;
  /**
   * Navigates to the given locator and programmatically selects the matched
   * text (using `locator.text.highlight` and the surrounding `before`/`after`
   * context to disambiguate). Resolves with `true` if the selection was applied.
   */
  setSelection(locator: Locator): Promise<boolean>;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  cancelSearch(): void;
  getResource(href: string): Promise<ResourceResponse>;
  getPositions(): Promise<Locator[]>;
  getTableOfContents(): Promise<Link[]>;
  applyPreferences(preferences: Preferences): void;
  setPdfPreferences(preferences: PdfPreferences): void;
  setComicPreferences(preferences: ComicPreferences): void;
  setAudioPreferences(preferences: AudioPreferences): void;
  play(): void;
  pause(): void;
  stop(): void;
  seekTo(position: number): void;
  skipToNext(): void;
  skipToPrevious(): void;
  setPlaybackRate(rate: number): void;
  getMediaState(): Promise<MediaState>;
}

export type ReadiumView = HybridView<ReadiumViewProps, ReadiumViewMethods>;

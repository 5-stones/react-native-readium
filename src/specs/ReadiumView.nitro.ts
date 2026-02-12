import {
  type HybridView,
  type HybridViewProps,
  type HybridViewMethods,
} from 'react-native-nitro-modules';

// ── Locator ──────────────────────────────────────────────────────────────────

export interface LocatorLocations {
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
  templated: boolean;
  type?: string;
  title?: string;
  rels?: string[];
  height?: number;
  width?: number;
  bitrate?: number;
  duration?: number;
  languages?: string[];
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

// ── Events ───────────────────────────────────────────────────────────────────

export interface PublicationReadyEvent {
  tableOfContents: Link[];
  positions: Locator[];
  metadata: PublicationMetadata;
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

// ── File ─────────────────────────────────────────────────────────────────────

export interface ReadiumFile {
  url: string;
  initialLocation?: Locator;
}

// ── HybridView ───────────────────────────────────────────────────────────────

export interface ReadiumViewProps extends HybridViewProps {
  file?: ReadiumFile;
  location?: Locator;
  preferences?: Preferences;
  decorations?: DecorationGroup[];
  selectionActions?: SelectionAction[];
  onLocationChange?: (locator: Locator) => void;
  onPublicationReady?: (event: PublicationReadyEvent) => void;
  onDecorationActivated?: (event: DecorationActivatedEvent) => void;
  onSelectionChange?: (event: SelectionEvent) => void;
  onSelectionAction?: (event: SelectionActionEvent) => void;
}

export interface ReadiumViewMethods extends HybridViewMethods {
  goForward(): void;
  goBackward(): void;
}

export type ReadiumView = HybridView<ReadiumViewProps, ReadiumViewMethods>;

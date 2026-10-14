/**
 * How the reader lays out and styles a publication, and which of those
 * settings the publication it has open actually responds to.
 */

// ── Preferences ──────────────────────────────────────────────────────────────

/**
 * Font families Readium knows by name, including the ones it ships.
 *
 * A suggestion list rather than a limit: `Preferences.fontFamily` takes any
 * family the platform can resolve, and these are the ones you get for free.
 */
export type ReaderFontFamily =
  | 'serif'
  | 'sans-serif'
  | 'cursive'
  | 'fantasy'
  | 'monospace'
  | 'AccessibleDfA'
  | 'IA Writer Duospace'
  | 'OpenDyslexic';

/** What to do with a publication's images in a dark theme. */
export type ReaderImageFilter = 'darken' | 'invert';

/** Which way the reader turns pages: left to right, or right to left. */
export type ReaderReadingProgression = 'ltr' | 'rtl';

/** Whether two pages are shown side by side, as in a printed book. */
export type ReaderSpread = 'auto' | 'never' | 'always';

/** How a publication's text is aligned, where the publication allows it. */
export type ReaderTextAlign =
  | 'center'
  | 'justify'
  | 'start'
  | 'end'
  | 'left'
  | 'right';

/** The reader's colour scheme. */
export type ReaderTheme = 'light' | 'dark' | 'sepia';

/** How a PDF's page is sized to the view. */
export type ReaderFit = 'cover' | 'contain' | 'width' | 'height';

/** Which way a scrolled PDF scrolls. */
export type ReaderScrollAxis = 'horizontal' | 'vertical';

export interface EpubPreferences {
  backgroundColor?: string;
  /**
   * How many columns a reflowable publication is laid out in.
   *
   * A string on the wire rather than a named union, which is the one
   * concession in this file: nitrogen turns a union into a native enum, and
   * `'1'` becomes the Swift case `.1`, which does not compile. The public
   * type narrows it — see {@link ReaderColumnCount} — and each platform
   * parses it.
   */
  columnCount?: string;
  /**
   * Any font family the platform can resolve, by name.
   * {@link ReaderFontFamily} lists the ones Readium knows; the public
   * `Preferences` offers them as suggestions.
   */
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  hyphens?: boolean;
  imageFilter?: ReaderImageFilter;
  language?: string;
  letterSpacing?: number;
  ligatures?: boolean;
  lineHeight?: number;
  pageMargins?: number;
  paragraphIndent?: number;
  paragraphSpacing?: number;
  publisherStyles?: boolean;
  readingProgression?: ReaderReadingProgression;
  scroll?: boolean;
  spread?: ReaderSpread;
  textAlign?: ReaderTextAlign;
  textColor?: string;
  textNormalization?: boolean;
  theme?: ReaderTheme;
  typeScale?: number;
  verticalText?: boolean;
  wordSpacing?: number;
}

export interface PdfPreferences {
  backgroundColor?: string;
  fit?: ReaderFit;
  offsetFirstPage?: boolean;
  pageSpacing?: number;
  readingProgression?: ReaderReadingProgression;
  scroll?: boolean;
  scrollAxis?: ReaderScrollAxis;
  spread?: ReaderSpread;
  visibleScrollbar?: boolean;
}

export interface Preferences extends EpubPreferences, PdfPreferences {}

// ── Capabilities ─────────────────────────────────────────────────────────────

/**
 * Something the reader can do with the publication it opened.
 *
 * Every `Preferences` field, plus the abilities that are not preferences.
 */
// Written out rather than mapped from `Preferences`: nitrogen's parser does
// not evaluate mapped types, and generates nothing for what it cannot read.
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

/** Reported by `onPreferencesChanged` once preferences are applied. */
export interface PreferencesChangedEvent {
  /** Which preferences and features apply now. */
  capabilities: Capabilities;
}

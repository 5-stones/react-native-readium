import type { Locator } from 'react-native-readium';

/**
 * What kind of publication this is — drives the reader layout:
 * - `epub`      → paginated text (default)
 * - `audiobook` → audio only, rendered with a full-screen audio player
 * - `readalong` → EPUB text + synchronized audio (Media Overlays): text + audio bar
 */
export type BookKind = 'epub' | 'audiobook' | 'readalong';

export interface BookOption {
  id: string;
  title: string;
  author: string;
  /** Narrator, shown for audiobooks / read-along publications. */
  narrator?: string;
  kind?: BookKind;
  epubUrl?: string;
  epubPath?: string;
  /**
   * For `readalong` books: a separate narration audio track played alongside the
   * EPUB text (react-native-readium has no Media Overlays support, so the audio
   * is driven independently via expo-audio).
   */
  audioUrl?: string;
  /** Bundled epub asset reference: `require('./resources/book.epub')` */
  bundledAsset?: number;
}

export interface ReaderProps {
  /** Stable publication identifier used to scope persisted reading data */
  publicationId?: string;
  /** URL to the EPUB file (used for web or downloading on native) */
  epubUrl?: string;
  /** Local file path for the EPUB (used on native platforms after download) */
  epubPath?: string;
  /** Bundled epub asset reference: `require('./resources/book.epub')` */
  bundledAsset?: number;
  /** Initial location to open the book at */
  initialLocation?: Locator;
}

export interface CurrentSelection {
  locator: Locator;
  text: string;
}

export interface PendingHighlight {
  locator: Locator;
  selectedText: string;
}

export interface Bookmark {
  id: string;
  publicationId: string;
  locator: Locator;
  createdAt: string;
  updatedAt: string;
  label?: string;
}

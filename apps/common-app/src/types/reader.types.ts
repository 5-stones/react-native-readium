import type { Locator } from 'react-native-readium';

export interface BookOption {
  id: string;
  title: string;
  author: string;
  epubUrl?: string;
  epubPath?: string;
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

import type { Locator } from 'react-native-readium';

export type PublicationFormat = 'epub' | 'cbz';

export interface BookOption {
  id: string;
  title: string;
  author: string;
  format?: PublicationFormat;
  url?: string;
  path?: string;
  /** Filename of a file bundled in the app assets (e.g. 'book.epub' or 'comic.cbz') */
  bundledAsset?: string;
}

export interface ReaderProps {
  format?: PublicationFormat;
  /** URL to the publication file (web or download source on native) */
  url?: string;
  /** Local file path (native, after download or copy from bundle) */
  path?: string;
  /** Filename of a file bundled in the app assets (e.g. 'book.epub' or 'comic.cbz') */
  bundledAsset?: string;
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

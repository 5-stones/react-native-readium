import type { Locator } from 'react-native-readium';

export interface BookOption {
  id: string;
  title: string;
  author: string;
  epubUrl: string;
  epubPath?: string;
}

export interface ReaderProps {
  /** URL to the EPUB file (used for web or downloading on native) */
  epubUrl: string;
  /** Local file path for the EPUB (used on native platforms after download) */
  epubPath?: string;
  /** Initial location to open the book at */
  initialLocation?: Locator;
  /** Available books to switch between. Shows a picker button when provided with 2+ entries. */
  books?: BookOption[];
}

export interface CurrentSelection {
  locator: Locator;
  text: string;
}

export interface PendingHighlight {
  locator: Locator;
  selectedText: string;
}

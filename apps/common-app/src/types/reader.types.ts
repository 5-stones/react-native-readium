import type { Locator } from 'react-native-readium';

export interface BookOption {
  id: string;
  title: string;
  author: string;
  /**
   * Where the publication lives. Its shape determines how it is loaded:
   *
   *   `https://…`         remote - downloaded and cached on native, read
   *                       directly on web
   *   `/…` or `file://…`  an absolute local path, used as-is
   *   `book.epub`         an asset bundled with the app
   *
   * The format is not encoded here: Readium sniffs it natively, and the web
   * view picks its navigator from the URL.
   */
  asset: string;
}

export interface ReaderProps {
  /** See {@link BookOption.asset}. */
  asset?: string;
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

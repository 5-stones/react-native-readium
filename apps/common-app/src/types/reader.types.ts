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
  /** Set when the publication is DRM-protected, e.g. with Readium LCP. */
  protection?: 'lcp';
  /**
   * Anything else worth showing about this publication, rendered as badges
   * beside the derived ones — a fixed layout, a passphrase, why it is here.
   *
   * Only for what cannot be worked out from the book itself: its format,
   * where it is, whether a copy is stored and whether it is protected all
   * become badges on their own.
   */
  tags?: string[];
  /**
   * Whether this book is offered here. Defaults to true; set it from
   * `Platform.OS` for a book only one platform can open — a bundled asset
   * where there is no bundle, or an unpacked manifest the native toolkits
   * cannot read.
   *
   * Books are declared once, in `common-app/src/books.ts`, and {@link books}
   * is what is left after this is applied.
   */
  enabled?: boolean;
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

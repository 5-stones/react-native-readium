import { Platform } from 'react-native';

import type { BookOption } from './types/reader.types';
import { examplePublicationUrl } from './utils/exampleApi';

/** Nothing on web is packed: its navigators read an unpacked manifest. */
const isWeb = Platform.OS === 'web';

/**
 * Every publication the example apps offer, declared once.
 *
 * A book that only one platform can open stays in this list and says so
 * through `enabled`, rather than living in a second list somewhere — so what
 * the examples cover, and where a given book does *not* work, is readable in
 * one place. Where a book exists on both platforms in different shapes, the
 * shape is chosen with `Platform.select`.
 *
 * {@link books} is this list with the disabled entries removed, and is what
 * the apps render.
 */
const ALL_BOOKS: BookOption[] = [
  /**
   * Served by the example API in `apps/example-nextjs`, which guards its
   * files behind a token and redirects to a location that expires in five
   * seconds — so opening this exercises `resolveSource`, and so does every
   * page turn.
   *
   * Built by `yarn workspace example-nextjs make:streaming-book`, which
   * rebuilds the book with its chapters interleaved either side of 6.5 MB of
   * padding. Both toolkits read a small archive once and cache it whole; this
   * one has to keep going back to the network, which is the only way a
   * location gets the chance to expire mid-read.
   *
   * Start the API first: `yarn workspace example-nextjs dev`. Opening the
   * book without it says so.
   *
   * Native only: the API serves packed EPUBs, which the web navigators cannot
   * read.
   */
  {
    id: 'summa-theologica-example-api',
    title: 'Summa Theologica',
    author: 'St. Thomas Aquinas',
    asset: examplePublicationUrl('summa-theologica-streaming.epub'),
    tags: ['Streaming', 'Expiring link'],
    enabled: !isWeb,
  },
  {
    id: 'moby-dick',
    title: 'Moby Dick',
    author: 'Herman Melville',
    asset: Platform.select({
      web: '/moby-dick_epub/manifest.json',
      default: 'https://www.gutenberg.org/ebooks/2701.epub3.images',
    }),
  },
  {
    id: 'brothers-karamazov',
    title: 'The Brothers Karamazov',
    author: 'Fyodor Dostoevsky',
    asset: Platform.select({
      web: '/the-brothers-karamazov_epub/manifest.json',
      default: 'the-brothers-karamazov.epub',
    }),
  },
  {
    id: 'sense-and-sensibility',
    title: 'Sense and Sensibility',
    author: 'Jane Austen',
    // The web copy is served from the Next app's public/ dir so it is
    // same-origin: pdf.js fetches the bytes over XHR, so a cross-origin PDF
    // without CORS headers (as gutenberg.org serves) cannot be read at all.
    asset: Platform.select({
      web: '/sense-and-sensibility.pdf',
      default: 'sense-and-sensibility.pdf',
    }),
  },
  {
    id: 'confessions',
    title: 'The Confessions of St. Augustine',
    author: 'Augustine of Hippo',
    // Packed, and there is no unpacked copy to point web at.
    asset: 'https://www.gutenberg.org/ebooks/3296.epub3.images',
    enabled: !isWeb,
  },
  {
    id: 'svg-in-spine',
    title: 'SVG In Spine',
    author: 'Unknown',
    asset: 'svg-in-spine.epub',
    tags: ['Fixed layout'],
    enabled: !isWeb,
  },
  {
    id: 'alice-in-wonderland',
    title: "Alice's Adventures in Wonderland",
    author: 'Lewis Carroll',
    // An unpacked manifest, which only the web navigators read.
    asset: 'https://alice.dita.digital/manifest.json',
    enabled: isWeb,
  },
  {
    id: 'bella-the-dragon',
    title: 'Bella The Dragon',
    author: 'Barbara Nick',
    tags: ['Fixed layout'],
    asset:
      'https://publication-server.readium.org/webpub/Z3M6Ly9yZWFkaXVtLXBsYXlncm91bmQtZmlsZXMvZGVtby9CZWxsYU9yaWdpbmFsMy5lcHVi/manifest.json',
    enabled: isWeb,
  },
  // LCP test books, passphrase "test". Debug builds open them without liblcp,
  // through the basic-profile client in ios/BasicProfileLCPClient.swift and
  // android/app/src/lcpTestClient. No web equivalent: content protections are
  // a native concern.
  {
    id: 'lcp-daisy',
    title: 'Daisy',
    author: 'EDRLab test license',
    asset: 'lcp-daisy.lcpdf',
    protection: 'lcp',
    tags: ['Passphrase "test"'],
    enabled: !isWeb,
  },
  {
    id: 'lcp-moby-dick',
    title: 'Moby Dick',
    author: 'Herman Melville',
    asset: 'lcp-moby-dick.epub',
    protection: 'lcp',
    tags: ['Basic-profile fixture', 'Passphrase "test"'],
    enabled: !isWeb,
  },
];

/** The books this platform can open, in the order they are declared. */
export const books: BookOption[] = ALL_BOOKS.filter(
  (book) => book.enabled !== false
);

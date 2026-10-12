// `publicationUtils` imports the ESM-only `@readium/shared` for functions this
// suite never reaches; `normalizePublicationURL` needs none of it.
jest.mock('@readium/shared', () => ({}), { virtual: true });

import {
  isEpubURL,
  isPdfURL,
  isSupportedPublicationURL,
} from '../publicationFormat';
import { normalizePublicationURL } from '../publicationUtils';

describe('isEpubURL', () => {
  it.each([
    '/moby-dick_epub/manifest.json',
    'https://alice.dita.digital/manifest.json',
    'https://example.com/MANIFEST.JSON',
    // Neither suffix is part of the filename, so neither hides the manifest.
    'https://example.com/manifest.json?v=2',
    'https://example.com/manifest.json#intro',
  ])('claims %s', (url) => {
    expect(isEpubURL(url)).toBe(true);
  });

  it.each([
    'https://example.com/book.epub',
    'https://example.com/manifest.jsonp',
    'https://api.example.com/stream/content/123',
    '',
  ])('does not claim %s', (url) => {
    expect(isEpubURL(url)).toBe(false);
  });
});

describe('isPdfURL', () => {
  it.each([
    '/sense-and-sensibility.pdf',
    'https://example.com/Book.PDF',
    // The query is dropped before the extension is read, so a signed url still
    // reads as a PDF.
    'https://cdn.example.com/book.pdf?token=abc&expires=1',
    // As is the fragment pdf.js itself accepts, e.g. a page to open at.
    'https://example.com/book.pdf#page=3',
  ])('claims %s', (url) => {
    expect(isPdfURL(url)).toBe(true);
  });

  it.each([
    '/moby-dick_epub/manifest.json',
    'https://example.com/book.pdf.zip',
    'https://api.example.com/stream/content/123',
    '',
  ])('does not claim %s', (url) => {
    expect(isPdfURL(url)).toBe(false);
  });
});

describe('isSupportedPublicationURL', () => {
  it('accepts a url either navigator claims', () => {
    expect(isSupportedPublicationURL('/book_epub/manifest.json')).toBe(true);
    expect(isSupportedPublicationURL('/book.pdf')).toBe(true);
  });

  it('rejects a missing url', () => {
    expect(isSupportedPublicationURL(undefined)).toBe(false);
    expect(isSupportedPublicationURL('')).toBe(false);
  });

  /**
   * The case that used to hang: an endpoint that only redirects to the
   * publication is claimed by neither navigator, so the view waited forever on
   * one that was never built. `ReadiumView` now reports it instead.
   */
  it('rejects a url that merely points at the publication', () => {
    expect(
      isSupportedPublicationURL('https://api.example.com/stream/content/123')
    ).toBe(false);
  });
});

/**
 * The predicate chooses the navigator; `normalizePublicationURL` then tells it
 * where the publication's resources live. A url the first accepts and the
 * second cannot locate is fetched as `<url>/manifest.json`, which 404s — so
 * they are pinned together here.
 */
describe('agreement with normalizePublicationURL', () => {
  it.each([
    ['https://example.com/book_epub/manifest.json', 'https://example.com/book_epub/'],
    // Case is not the filename's business for either of them.
    ['https://example.com/book_epub/MANIFEST.JSON', 'https://example.com/book_epub/'],
    // The base is read off the path, so a '/' in the query is not a separator.
    ['https://example.com/book_epub/manifest.json?p=a/b', 'https://example.com/book_epub/'],
  ])('derives the directory of %s', (url, expected) => {
    expect(isEpubURL(url)).toBe(true);
    expect(normalizePublicationURL(url)).toBe(expected);
  });

  it('appends a separator for anything it does not read as a manifest', () => {
    expect(isEpubURL('https://example.com/book_epub')).toBe(false);
    expect(normalizePublicationURL('https://example.com/book_epub')).toBe(
      'https://example.com/book_epub/'
    );
  });
});

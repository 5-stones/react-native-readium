// Not resolvable from this package, and nothing here reaches it: these two
// functions are string handling.
jest.mock(
  '@readium/shared',
  () => ({
    Locator: class {},
    LocatorLocations: class {},
    Manifest: class {},
  }),
  { virtual: true }
);

import {
  absolutePublicationURL,
  normalizePublicationURL,
} from '../publicationUtils';

/**
 * Where a publication is read from, as the navigator needs it stated.
 *
 * The base matters more than it looks: the navigator writes it into a
 * Content-Security-Policy on every chapter it builds, so one the browser
 * cannot parse blocks the chapter's own images with no request to show for
 * it.
 */
describe('absolutePublicationURL', () => {
  const origin = 'https://reader.test';

  beforeEach(() => {
    // jsdom's location, which the helper resolves against.
    Object.defineProperty(window, 'location', {
      value: new URL(`${origin}/library/shelf`),
      writable: true,
    });
  });

  it('gives a root-relative url an origin', () => {
    expect(absolutePublicationURL('/moby-dick_epub/manifest.json')).toBe(
      `${origin}/moby-dick_epub/manifest.json`
    );
  });

  it('resolves a document-relative url against the page', () => {
    expect(absolutePublicationURL('book/manifest.json')).toBe(
      `${origin}/library/book/manifest.json`
    );
  });

  it('leaves an absolute url alone', () => {
    const url = 'https://cdn.test/signed/manifest.json?token=abc';
    expect(absolutePublicationURL(url)).toBe(url);
  });

  it('passes through what it cannot resolve', () => {
    expect(absolutePublicationURL('')).toBe('');
  });
});

describe('normalizePublicationURL', () => {
  it('takes the directory a manifest sits in', () => {
    expect(
      normalizePublicationURL(
        'https://reader.test/moby-dick_epub/manifest.json'
      )
    ).toBe('https://reader.test/moby-dick_epub/');
  });

  /** A '/' in a query is not the last separator. */
  it('ignores a query and a fragment', () => {
    expect(
      normalizePublicationURL('https://cdn.test/b/manifest.json?path=a/b#x')
    ).toBe('https://cdn.test/b/');
  });

  it('keeps a directory url as a directory', () => {
    expect(normalizePublicationURL('https://cdn.test/book')).toBe(
      'https://cdn.test/book/'
    );
  });
});

/**
 * Which navigator a publication URL belongs to.
 *
 * Web has no format sniffing to fall back on the way the native side does — a
 * publication is fetched by URL, so the URL is all there is to go on. Each
 * navigator asks about its own format, and a URL neither claims cannot be
 * opened at all; see `ReadiumView`, which reports that rather than waiting on a
 * navigator that is never going to be built.
 */

/**
 * The lowercased path of a URL: query and fragment removed.
 *
 * Every question about a publication's format is asked of this rather than of
 * the raw URL, and `normalizePublicationURL` derives the base directory from it
 * too. The two have to agree: a URL one of them reads as a publication but the
 * other cannot locate opens as a 404 rather than a book.
 *
 * Neither suffix belongs to the filename. A PDF is commonly addressed with a
 * fragment (`book.pdf#page=3`), and a signed URL may carry its credential in
 * the query.
 */
const publicationURLPath = (url: string): string =>
  url.toLowerCase().split(/[?#]/)[0];

/** An unpacked EPUB is addressed by its manifest. */
export const isEpubURL = (url: string): boolean =>
  publicationURLPath(url).endsWith('manifest.json');

/** A PDF is addressed by the file itself. */
export const isPdfURL = (url: string): boolean =>
  publicationURLPath(url).endsWith('.pdf');

/** Whether any navigator on web knows what to do with `url`. */
export const isSupportedPublicationURL = (url?: string): boolean =>
  !!url && (isEpubURL(url) || isPdfURL(url));

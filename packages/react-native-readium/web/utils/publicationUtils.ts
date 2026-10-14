import {
  Locator,
  LocatorLocations,
  Manifest,
  Publication,
} from '@readium/shared';
import type { Link } from '../../src/interfaces/Link';
import { isEpubURL } from './publicationFormat';

/**
 * Normalizes a publication URL to ensure it ends with /
 * If URL ends with manifest.json, extracts the base directory
 *
 * `isEpubURL` decides what counts as a manifest, so this stays in step with the
 * check that chose the EPUB navigator in the first place — it used to test the
 * suffix itself, case sensitively, and so derived a directory of its own for a
 * url like `MANIFEST.JSON` that the navigator had already accepted.
 */
/**
 * The publication's url with an origin on it.
 *
 * A relative url is a reasonable thing to pass — `/book/manifest.json` is
 * what a web app naturally writes — but it cannot stay relative, because the
 * navigator puts the publication's base into a Content-Security-Policy on
 * every chapter it builds: `img-src <base> blob: data:`. A bare path is not a
 * valid CSP source expression, so the browser discards it and the chapter's
 * own images, stylesheets and fonts are blocked before a single request is
 * made — a broken image with nothing in the network log to explain it.
 *
 * Left alone where there is no document to resolve against, which is anywhere
 * this is reached during server rendering.
 */
export function absolutePublicationURL(url: string): string {
  if (typeof window === 'undefined' || !url) return url;

  try {
    return new URL(url, window.location.href).href;
  } catch {
    return url;
  }
}

export function normalizePublicationURL(url: string): string {
  if (isEpubURL(url)) {
    // The directory the manifest sits in, taken from the path alone so that a
    // '/' inside a query or fragment is not mistaken for the last separator.
    const [path] = url.split(/[?#]/);
    return path.substring(0, path.lastIndexOf('/') + 1);
  }
  return url.endsWith('/') ? url : `${url}/`;
}

/**
 * Creates positions array from publication reading order
 * NOTE: The published npm packages (v2.2.5) require positions to be passed explicitly
 */
export function createPositions(publication: Publication): Locator[] {
  return publication.readingOrder.items.map((link: any, idx: number) => {
    const position = idx + 1;
    return new Locator({
      href: link.href,
      type: link.type,
      title: link.title,
      locations: new LocatorLocations({
        position: position,
        progression: 0,
        totalProgression: idx / publication.readingOrder.items.length,
      }),
    });
  });
}

/**
 * Normalizes a Readium web Link into our Link interface, recursively
 * processing children.
 */
function normalizeLink(webLink: any): Link {
  const link: Link = {
    href: webLink.href,
    title: webLink.title ?? undefined,
    rels: webLink.rels?.length ? webLink.rels : undefined,
    languages: webLink.languages?.length ? webLink.languages : undefined,
  };

  const childItems = webLink.children?.items ?? webLink.children;
  if (Array.isArray(childItems) && childItems.length > 0) {
    link.children = childItems.map((child: any) => normalizeLink(child));
  }

  return link;
}

/**
 * Extracts table of contents items from manifest and normalizes them
 * into our Link interface with children.
 */
export function extractTableOfContents(manifest: Manifest): Link[] {
  const rawToc = Array.isArray(manifest.toc)
    ? manifest.toc
    : // @ts-ignore
      manifest.toc?.items || [];

  return rawToc.map((item: any) => normalizeLink(item));
}

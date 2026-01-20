import {
  Locator,
  LocatorLocations,
  Manifest,
  Publication,
} from '@readium/shared';

/**
 * Normalizes a publication URL to ensure it ends with /
 * If URL ends with manifest.json, extracts the base directory
 */
export function normalizePublicationURL(url: string): string {
  if (url.endsWith('manifest.json')) {
    return url.substring(0, url.lastIndexOf('/') + 1);
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
 * Extracts table of contents items from manifest
 */
export function extractTableOfContents(manifest: Manifest): any[] {
  return Array.isArray(manifest.toc)
    ? manifest.toc
    : // @ts-ignore
      manifest.toc.items || [];
}

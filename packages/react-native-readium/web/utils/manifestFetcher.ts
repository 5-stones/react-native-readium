import { Fetcher, HttpFetcher, Link, Manifest } from '@readium/shared';
import { normalizeManifest } from './manifestNormalizer';

/**
 * Fetches and deserializes the publication manifest
 */
export async function fetchManifest(publicationURL: string): Promise<{
  manifest: Manifest;
  fetcher: Fetcher;
}> {
  const manifestLink = new Link({ href: 'manifest.json' });
  const fetcher: Fetcher = new HttpFetcher(undefined, publicationURL);
  const fetched = fetcher.get(manifestLink);
  const selfLink = (await fetched.link()).toURL(publicationURL)!;

  const response = await fetched.readAsJSON();
  const responseObj = normalizeManifest(response as any);

  let manifest;
  try {
    manifest = Manifest.deserialize(responseObj as string);
  } catch (error) {
    console.error('Error during manifest deserialization:', error);
    console.error('Manifest that failed:', responseObj);
    throw error;
  }

  if (!manifest) {
    console.error(
      'Failed to deserialize manifest (returned null/undefined):',
      responseObj
    );
    throw new Error('Manifest deserialization returned null/undefined');
  }

  manifest.setSelfLink(selfLink);
  return { manifest, fetcher };
}

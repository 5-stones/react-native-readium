import { Fetcher, HttpFetcher, Link, Manifest } from '@readium/shared';
import type { FetchImplementation } from '@readium/shared';
import { normalizeManifest } from './manifestNormalizer';

/**
 * A `Fetcher` whose base url is read per request rather than fixed when it is
 * built.
 *
 * `HttpFetcher` holds `baseUrl` as `private readonly` and resolves every link
 * against it, so a publication keeps fetching from wherever it was first
 * opened. That is fine until the location changes — replacing an expired
 * credential, say: `Manifest.setSelfLink` moves `baseURL`, which is what the
 * navigator rebuilds its chapters against, but the fetcher goes on requesting
 * them from the old one and every chapter fails.
 */
class RebasingHttpFetcher implements Fetcher {
  constructor(
    private readonly client: FetchImplementation | undefined,
    private readonly baseURL: () => string
  ) {}

  links(): Link[] {
    return [];
  }

  get(link: Link) {
    return new HttpFetcher(this.client, this.baseURL()).get(link);
  }

  close() {
    // Nothing is held open.
  }
}

/**
 * Fetches and deserializes the publication manifest
 */
export async function fetchManifest(
  publicationURL: string,
  /**
   * Used for every request the publication makes — the manifest and each
   * chapter — so a caller can see them fail. `HttpFetcher` otherwise defaults
   * to `window.fetch`, and a failure disappears into the navigator.
   */
  client?: FetchImplementation,
  /**
   * Where the publication's resources are, read on each request. Defaults to
   * where the manifest was fetched from; pass a getter to move the whole
   * publication to a new location without reopening it.
   */
  baseURL: () => string = () => publicationURL
): Promise<{
  manifest: Manifest;
  fetcher: Fetcher;
}> {
  const manifestLink = new Link({ href: 'manifest.json' });
  const fetcher: Fetcher = new RebasingHttpFetcher(client, baseURL);
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

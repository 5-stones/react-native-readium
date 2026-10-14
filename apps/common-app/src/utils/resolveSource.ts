import type {
  PublicationSource,
  ResolveSourceRequest,
} from 'react-native-readium';

import {
  EXAMPLE_API_TOKEN,
  EXAMPLE_API_UNREACHABLE,
  isExampleApiUrl,
} from './exampleApi';

/**
 * A bearer token for an API of your own, if you point a book at one. Left
 * empty, nothing is sent and only the example API is authenticated against.
 *
 * Not a place for a real credential that outlives your testing.
 */
const EXTERNAL_API_TOKEN = '';

/**
 * Url shapes that name a publication without serving it, and so have to be
 * exchanged for somewhere its bytes actually are.
 */
const GUARDED = ['/api/publications/', '/stream/', '/download/'];

const isGuarded = (url: string) => GUARDED.some((path) => url.includes(path));

/**
 * Where to read a publication from, asked for by the library before it opens
 * one and again whenever a location stops working.
 *
 * The exchange here is the common one: a guarded endpoint that answers 401
 * without a credential and redirects to a signed, short lived location with
 * one. The library never sees the credential and never learns what the
 * location is worth — it asks again when one fails.
 */
export async function resolveSource({
  url,
}: ResolveSourceRequest): Promise<PublicationSource> {
  // Anything that is not a guarded endpoint is already somewhere the reader
  // can fetch, so hand it straight back.
  if (!isGuarded(url)) {
    console.log(
      '[RNR] resolveSource: source does not need to be resolved. skipping.',
      url
    );
    return { url };
  }

  const token = isExampleApiUrl(url) ? EXAMPLE_API_TOKEN : EXTERNAL_API_TOKEN;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'HEAD',
      // `redirect: 'follow'` is what makes `response.url` the signed
      // location. A manual redirect yields an opaque response whose status is
      // 0 and whose `Location` cannot be read, which is why inspecting one
      // shows nothing.
      //
      // `no-store` because a refresh must not be answered from cache: the
      // point of asking again is to get a location that has not expired.
      redirect: 'follow',
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      // `redirect` and `cache` are web options that React Native's
      // `RequestInit` does not declare, though its fetch honours the first.
    } as RequestInit);
  } catch (error) {
    // Nothing answered at all, which for the example API usually means it is
    // not running.
    throw new Error(
      isExampleApiUrl(url)
        ? EXAMPLE_API_UNREACHABLE
        : `Couldn't reach ${url}: ${String((error as Error)?.message ?? error)}`
    );
  }

  if (!response.ok || !response.url) {
    throw new Error(
      `Couldn't resolve ${url} (status ${response.status}).` +
        (response.status === 401 && isExampleApiUrl(url)
          ? ' The example API refused the token.'
          : '')
    );
  }

  console.log('[RNR] resolveSource: source has been successfully resolve', {
    from: url,
    to: response.url,
  });
  return { url: response.url };
}

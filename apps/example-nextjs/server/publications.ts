import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * A stand-in for a publication host that guards its files behind a credential
 * and hands out short lived, signed locations for them — the shape of the
 * problem `resolveSource` exists for, with nothing to sign up for.
 *
 * Two endpoints make up the flow:
 *
 *   `GET /api/publications/<name>`  the publication's identity. 401 without a
 *                                   bearer token; otherwise a 302 to a signed
 *                                   location that expires in seconds.
 *   `GET /api/signed/<name>?exp&sig` the bytes, with range support. 403 once
 *                                   `exp` has passed.
 *
 * Nothing here is a model of good security: the token is a constant and the
 * secret has a default. It is a model of a *timing* problem.
 */

/** The token the example apps send. */
export const API_TOKEN = process.env.EXAMPLE_API_TOKEN ?? 'example-reader-token';

const SIGNING_SECRET =
  process.env.EXAMPLE_API_SECRET ?? 'example-signing-secret';

/**
 * How long a signed location lasts. Deliberately short: the interesting case
 * is a credential expiring while someone reads, which at a realistic hour-long
 * expiry is not something you can sit and wait for.
 */
export const DEFAULT_TTL_MS = Number(process.env.EXAMPLE_SIGNED_TTL_MS ?? 15_000);

/**
 * Where the publications are, in the order they are looked for:
 *
 *   `publications/`                     files only this API serves, which is
 *                                       where a book too large to bundle into
 *                                       the apps belongs
 *   `../example-native/resources`       what the native app already ships, so
 *                                       nothing is duplicated
 *
 * Drop a file in either and it is served. Note that `publications/` is not
 * `public/`: a file in there is reachable only through a signed location,
 * which is the point.
 */
const PUBLICATIONS_DIRS = [
  process.env.EXAMPLE_PUBLICATIONS_DIR,
  path.join(process.cwd(), 'publications'),
  path.join(process.cwd(), '..', 'example-native', 'resources'),
].filter((dir): dir is string => !!dir);

const CONTENT_TYPES: Record<string, string> = {
  '.epub': 'application/epub+zip',
  '.pdf': 'application/pdf',
};

/**
 * The file [name] refers to, or null when it is not a publication this serves.
 *
 * A name is a bare filename: anything with a path in it is refused rather than
 * cleaned up, and the resolved path is checked against the directory even so.
 */
export function publicationPath(name: string): string | null {
  if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) {
    return null;
  }
  if (!(path.extname(name) in CONTENT_TYPES)) return null;

  for (const dir of PUBLICATIONS_DIRS) {
    const resolved = path.resolve(dir, name);
    // Checked even though the name cannot contain a separator, because that
    // is one `decodeURIComponent` away from being untrue.
    if (path.dirname(resolved) !== path.resolve(dir)) continue;
    if (fs.existsSync(resolved)) return resolved;
  }

  return null;
}

export const contentType = (name: string): string =>
  CONTENT_TYPES[path.extname(name)] ?? 'application/octet-stream';

const signature = (name: string, expiresAt: number): string =>
  crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(`${name}|${expiresAt}`)
    .digest('base64url');

/** A location for [name] that stops working at [expiresAt]. */
export function signedUrl(
  req: NextApiRequest,
  name: string,
  expiresAt: number
): string {
  const host = req.headers.host ?? 'localhost:3200';
  const query = `exp=${expiresAt}&sig=${signature(name, expiresAt)}`;
  // Absolute, because whoever follows this redirect may not be a browser with
  // an opinion about what it is relative to.
  return `http://${host}/api/signed/${encodeURIComponent(name)}?${query}`;
}

export type SignatureVerdict = 'ok' | 'expired' | 'invalid';

export function verifySignature(
  name: string,
  exp: unknown,
  sig: unknown
): SignatureVerdict {
  const expiresAt = Number(exp);
  if (!Number.isFinite(expiresAt) || typeof sig !== 'string') return 'invalid';

  const expected = new Uint8Array(Buffer.from(signature(name, expiresAt)));
  const given = new Uint8Array(Buffer.from(sig));
  if (
    expected.length !== given.length ||
    !crypto.timingSafeEqual(expected, given)
  ) {
    return 'invalid';
  }

  return Date.now() > expiresAt ? 'expired' : 'ok';
}

/**
 * What a browser needs to read a response cross-origin.
 *
 * Only ever sent with a response that worked, which is not an oversight: the
 * hosts this stands in for do the same, and a 403 without these headers is
 * why a web reader can see that a request failed but not why. Leaving it out
 * is what makes that reproducible here.
 */
export function allowCrossOrigin(res: NextApiResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Range');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader(
    'Access-Control-Expose-Headers',
    'Accept-Ranges, Content-Length, Content-Range, Location'
  );
}

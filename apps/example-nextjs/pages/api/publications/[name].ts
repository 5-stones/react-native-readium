import type { NextApiRequest, NextApiResponse } from 'next';

import {
  API_TOKEN,
  DEFAULT_TTL_MS,
  allowCrossOrigin,
  publicationPath,
  signedUrl,
} from '../../../server/publications';

/**
 * A publication's identity: the url that names it, never its bytes.
 *
 * This is what a `file.url` points at. It answers 401 without a token and
 * otherwise redirects to a location that expires in seconds, so the location
 * is never something a client can hold on to — which is the whole reason
 * `resolveSource` exists.
 *
 * `?ttl=<ms>` overrides how long that location lasts, for testing something
 * other than an expiry you can hit by turning one page.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    allowCrossOrigin(res);
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS');
    res.status(405).end();
    return;
  }

  const name = String(req.query.name ?? '');
  if (!publicationPath(name)) {
    allowCrossOrigin(res);
    res.status(404).json({ error: `No publication named '${name}'.` });
    return;
  }

  if (req.headers.authorization !== `Bearer ${API_TOKEN}`) {
    res.setHeader('WWW-Authenticate', 'Bearer');
    allowCrossOrigin(res);
    res.status(401).json({ error: 'A bearer token is required.' });
    return;
  }

  const ttl = Number(req.query.ttl ?? DEFAULT_TTL_MS);
  const expiresAt = Date.now() + (Number.isFinite(ttl) ? ttl : DEFAULT_TTL_MS);

  allowCrossOrigin(res);
  // No-store, or a refresh could be answered from cache with the location
  // that just expired.
  res.setHeader('Cache-Control', 'no-store');
  res.redirect(302, signedUrl(req, name, expiresAt));
}

import fs from 'node:fs';
import type { NextApiRequest, NextApiResponse } from 'next';

import {
  allowCrossOrigin,
  contentType,
  publicationPath,
  verifySignature,
} from '../../../server/publications';

/** `bytes=<start>-<end>`, as far as a publication ever asks for one. */
function parseRange(
  header: string | undefined,
  size: number
): { start: number; end: number } | 'unsatisfiable' | null {
  if (!header) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return 'unsatisfiable';

  const [, rawStart, rawEnd] = match;
  if (rawStart === '' && rawEnd === '') return 'unsatisfiable';

  // A suffix range — the last n bytes — is how a ZIP reader finds the central
  // directory, so it has to work.
  const start =
    rawStart === '' ? Math.max(0, size - Number(rawEnd)) : Number(rawStart);
  const end =
    rawStart === ''
      ? size - 1
      : Math.min(rawEnd === '' ? size - 1 : Number(rawEnd), size - 1);

  if (start > end || start >= size) return 'unsatisfiable';
  return { start, end };
}

/**
 * A publication's bytes, at a location that stops working.
 *
 * Ranges are served because that is how both toolkits read a remote archive:
 * the tail first for the central directory, then an entry at a time.
 *
 * An expired or forged signature gets a 403 with no CORS headers, exactly as
 * the hosts this stands in for do — which is what leaves a web reader unable
 * to see the status of its own failure.
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
  const file = publicationPath(name);
  if (!file) {
    res.status(404).end(`No publication named '${name}'.`);
    return;
  }

  const verdict = verifySignature(name, req.query.exp, req.query.sig);
  if (verdict !== 'ok') {
    // No `allowCrossOrigin` here. See the note on the function.
    res
      .status(403)
      .end(
        verdict === 'expired'
          ? 'This location has expired.'
          : 'This location is not signed correctly.'
      );
    return;
  }

  const { size } = fs.statSync(file);
  const range = parseRange(req.headers.range, size);

  allowCrossOrigin(res);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', contentType(name));
  res.setHeader('Cache-Control', 'no-store');

  if (range === 'unsatisfiable') {
    res.setHeader('Content-Range', `bytes */${size}`);
    res.status(416).end();
    return;
  }

  const { start, end } = range ?? { start: 0, end: size - 1 };
  res.setHeader('Content-Length', String(end - start + 1));
  if (range) res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
  res.status(range ? 206 : 200);

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  fs.createReadStream(file, { start, end }).pipe(res);
}

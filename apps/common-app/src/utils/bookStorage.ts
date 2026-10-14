import { Platform } from 'react-native';
import RNFS from './RNFS';

type SourceKind = 'remote' | 'path' | 'bundled';

/**
 * Classifies an asset by its shape, so callers describe *where* a publication
 * is rather than *how* to fetch it.
 */
export function classify(asset: string): SourceKind {
  if (/^https?:\/\//i.test(asset)) return 'remote';
  if (asset.startsWith('file://') || asset.startsWith('/')) return 'path';
  return 'bundled';
}

export const isRemote = (asset: string) => classify(asset) === 'remote';

/**
 * A short, stable digest of [value]. FNV-1a, so it needs no dependency and
 * gives the same answer across launches — a stored copy has to be findable
 * again on the next open.
 */
/* eslint-disable no-bitwise -- a hash is bit twiddling by definition. */
function digest(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
/* eslint-enable no-bitwise */

/** Filename to store a publication under, derived from its url. */
function cacheNameFor(asset: string): string {
  const withoutQuery = asset.split('?')[0].split('#')[0];
  const name = withoutQuery.substring(withoutQuery.lastIndexOf('/') + 1);
  // The filename alone is not enough: an API that serves every publication as
  // `/file/<id>/index.epub` would store them all in one place, so downloading
  // one would make the rest look downloaded and opening any of them would read
  // whichever arrived first. Keying on the whole url fixes that; the original
  // name is kept on the end because Readium sniffs the format from the
  // extension.
  return `${digest(withoutQuery)}-${name || 'publication'}`;
}

/**
 * Where a stored copy of [asset] lives, or null where none can — a local path
 * is already where it lives, and web has no filesystem.
 */
export function localPathFor(asset: string): string | null {
  if (Platform.OS === 'web') return null;
  const kind = classify(asset);
  if (kind === 'path') return null;
  return `${RNFS.DocumentDirectoryPath}/${
    kind === 'bundled' ? asset : cacheNameFor(asset)
  }`;
}

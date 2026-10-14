import { Platform } from 'react-native';

import type { BookOption } from '../types/reader.types';
import { classify } from './bookStorage';
import { isExampleApiUrl } from './exampleApi';

/**
 * How a badge reads: what it is, versus what is notable about it.
 *
 * `info` is where the publication is or comes from, `success` that a copy is
 * on this device, `caution` that something stands between the reader and the
 * content, and `neutral` plain facts about the file.
 */
export type BadgeTone = 'neutral' | 'info' | 'success' | 'caution';

export interface Badge {
  label: string;
  tone: BadgeTone;
}

/**
 * What the file is, which the row shows in place of a generic book icon
 * rather than as a badge — every publication has one, so it tells you nothing
 * alongside the others.
 *
 * Readium sniffs the real format when it opens the publication; this is only
 * what the url suggests, which is all a library list can know before opening
 * anything.
 */
export function formatOf(asset: string): 'EPUB' | 'PDF' {
  const path = asset.split('?')[0].split('#')[0].toLowerCase();
  return path.endsWith('.pdf') || path.endsWith('.lcpdf') ? 'PDF' : 'EPUB';
}

/**
 * Where the publication is being read from, which a stored copy changes.
 *
 * `Bundled` is a publication that ships with the app: an asset on native, a
 * file the app serves itself on web. `On device` is a file on the filesystem,
 * which only native has — a leading-slash asset on web is a url the page's
 * own origin answers, not a path, so it is bundled rather than local.
 */
function location(asset: string, isStored: boolean): Badge {
  if (isStored) return { label: 'Stored', tone: 'success' };

  const kind = classify(asset);
  if (kind === 'remote') return { label: 'Remote', tone: 'info' };
  if (kind === 'bundled' || Platform.OS === 'web') {
    return { label: 'Bundled', tone: 'neutral' };
  }

  return { label: 'On device', tone: 'neutral' };
}

/**
 * The badges for [book], in a stable order: where it is, then whatever is
 * worth knowing about it.
 *
 * Derived from the book rather than written out, so a title can say what the
 * publication is called and nothing else. The format is not among them; see
 * {@link formatOf}.
 */
export function badgesFor(
  book: BookOption,
  { isStored = false }: { isStored?: boolean } = {}
): Badge[] {
  const badges: Badge[] = [location(book.asset, isStored)];

  if (book.protection === 'lcp') {
    badges.push({ label: 'LCP', tone: 'caution' });
  }

  if (isExampleApiUrl(book.asset)) {
    badges.push({ label: 'Example API', tone: 'info' });
  }

  for (const tag of book.tags ?? []) {
    badges.push({ label: tag, tone: 'neutral' });
  }

  return badges;
}

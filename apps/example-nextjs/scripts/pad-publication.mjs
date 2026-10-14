#!/usr/bin/env node
/**
 * Rebuilds an EPUB so that reading it over HTTP keeps going back to the
 * network — which an ordinary EPUB does not, and which is what the example
 * API's expiring locations need in order to expire on anything.
 *
 * iOS reads a remote archive through a 6 MB read-ahead window anchored at the
 * last read's start (`ZIPFoundationArchiveFactory.swift`), and caches an
 * archive under 5 MB in full rather than streaming it. A normal book's
 * chapters are kilobytes apart, so the first read covers all of them and no
 * page turn ever fetches again. Android's window is 8 kB, so it fetches
 * either way.
 *
 * Padding the end of the archive does nothing: what matters is not the file's
 * size but the distance between entries that are read one after another. So
 * this interleaves them:
 *
 *     [ mimetype | support files | even spine items ][ 6.5 MB pad ][ odd spine items ][ tail ]
 *
 * The spine — the reading order — is untouched; only where the entries sit in
 * the archive changes. Reading chapter to chapter therefore alternates across
 * the pad, and every turn lands outside the window the last one left behind.
 * A jump backwards is outside it too, so this holds in both directions.
 *
 * The tail block exists because the last 65557 bytes are cached separately
 * for the ZIP central directory; without it the final chapters would be
 * served from that cache.
 *
 * Usage:
 *   node scripts/pad-publication.mjs <source.epub> [output.epub]
 *
 * No dependencies and no `zip` binary: entry order and per-entry compression
 * both have to be exact, so the archive is written by `lib/epub.mjs`.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  createArchive,
  entryNames,
  packageDocument,
  unpack,
} from './epub.mjs';

/** iOS's read-ahead window. Consecutive spine items must be further apart. */
const BUFFER_WINDOW = 6 * 1024 * 1024;
/** Under this, both toolkits cache the whole archive and never stream it. */
const FULL_CACHE_LIMIT = 5 * 1024 * 1024;
/** Comfortably over the window, so the clusters can never share one. */
const PAD_SIZE = 6.5 * 1024 * 1024;
/** The ZIP central directory's own cache, which must not reach a chapter. */
const TAIL_SIZE = 128 * 1024;

// ── the rebuild ──────────────────────────────────────────────────────────────

const [source, destination] = process.argv.slice(2);
if (!source) {
  console.error(
    'usage: node scripts/pad-publication.mjs <source.epub> [output.epub]'
  );
  process.exit(2);
}

const output =
  destination ??
  path.join(
    path.dirname(source),
    `${path.basename(source, '.epub')}-streaming.epub`
  );

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'pad-publication-'));

try {
  const names = entryNames(source);
  const read = unpack(source, scratch);
  const spine = packageDocument(read).spine.filter((name) =>
    names.includes(name)
  );

  if (spine.length < 2) {
    throw new Error(`Found ${spine.length} spine items; nothing to interleave.`);
  }

  const archive = createArchive();
  const offsets = new Map();

  // The EPUB container format requires this first, stored, uncompressed.
  offsets.set('mimetype', archive.add('mimetype', read('mimetype'), { store: true }));

  const support = names.filter(
    (name) => name !== 'mimetype' && !spine.includes(name)
  );
  for (const name of support) offsets.set(name, archive.add(name, read(name)));

  // Even spine items stay down here; odd ones go beyond the pad.
  spine
    .filter((_, index) => index % 2 === 0)
    .forEach((name) => offsets.set(name, archive.add(name, read(name))));

  archive.add('pad.bin', Buffer.alloc(PAD_SIZE), { store: true });

  spine
    .filter((_, index) => index % 2 === 1)
    .forEach((name) => offsets.set(name, archive.add(name, read(name))));

  // Keeps the central directory's own cached tail clear of the chapters.
  archive.add('tail.bin', Buffer.alloc(TAIL_SIZE), { store: true });

  const bytes = archive.finish();
  fs.writeFileSync(output, bytes);

  // ── what it has to be for this to work at all ──────────────────────────────

  const problems = [];

  if (bytes.length <= FULL_CACHE_LIMIT) {
    problems.push(
      `${(bytes.length / 1048576).toFixed(2)} MB is under the ${
        FULL_CACHE_LIMIT / 1048576
      } MB full-cache limit, so it will never stream.`
    );
  }

  let tightest = Infinity;
  for (let i = 0; i < spine.length - 1; i += 1) {
    const from = offsets.get(spine[i]);
    const to = offsets.get(spine[i + 1]);
    // Only a forward jump can land inside the window the last read left; a
    // backward one is outside it by definition.
    if (to > from) tightest = Math.min(tightest, to - from);
  }

  if (tightest <= BUFFER_WINDOW) {
    problems.push(
      `The closest consecutive spine items are ${(
        tightest / 1048576
      ).toFixed(2)} MB apart, inside the ${
        BUFFER_WINDOW / 1048576
      } MB window — page turns will be served from memory.`
    );
  }

  console.log(`${path.relative(process.cwd(), output)}`);
  console.log(`  size            ${(bytes.length / 1048576).toFixed(2)} MB`);
  console.log(`  entries         ${names.length + 2}`);
  console.log(`  spine items     ${spine.length}`);
  console.log(
    `  closest pair    ${(tightest / 1048576).toFixed(2)} MB apart (needs > ${
      BUFFER_WINDOW / 1048576
    } MB)`
  );
  console.log('  reading order:');
  spine.slice(0, 8).forEach((name, index) => {
    const at = (offsets.get(name) / 1048576).toFixed(2);
    console.log(`    ${String(index).padStart(2)}  ${at.padStart(6)} MB  ${name}`);
  });
  if (spine.length > 8) console.log(`    ..  ${spine.length - 8} more`);

  if (problems.length) {
    console.error('\nThis will not exercise streaming:');
    problems.forEach((problem) => console.error(`  - ${problem}`));
    process.exit(1);
  }
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}

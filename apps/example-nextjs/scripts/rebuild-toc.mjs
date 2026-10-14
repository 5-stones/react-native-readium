#!/usr/bin/env node
/**
 * Rewrites an EPUB's navigation from the headings its chapters actually
 * contain.
 *
 * Some publications ship a table of contents that lists almost nothing —
 * Project Gutenberg's EPUBs often carry two entries for a book split across
 * twenty files — which makes them poor fixtures for anything that navigates.
 * This replaces both navigation documents with one entry per spine item and a
 * child per heading inside it.
 *
 * Only `toc.xhtml` and `toc.ncx` (or whatever the package document calls them)
 * change; every other entry is copied through byte for byte, in its original
 * order. The reading order is untouched — this is navigation, not content.
 *
 * Usage:
 *   node scripts/rebuild-toc.mjs <publication.epub> [output.epub]
 *
 * With no output it rewrites the input in place, via a temporary file.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  createArchive,
  entryNames,
  escapeXml,
  packageDocument,
  textOf,
  unpack,
} from './epub.mjs';

/** Headings in [markup], in document order, with the ids they can be linked by. */
function headings(markup) {
  const found = [];
  const pattern = /<(h[1-6])\b([^>]*)>([\s\S]*?)<\/\1>/gi;

  for (const [, tag, attributes, body] of markup.matchAll(pattern)) {
    const label = textOf(body);
    if (!label) continue;
    found.push({
      level: Number(tag[1]),
      id: /\bid="([^"]+)"/.exec(attributes)?.[1] ?? null,
      label,
    });
  }

  return found;
}

/**
 * A heading's numbering, when it has any: "QUESTION 42" is the 42nd of
 * "QUESTION ". Null for anything that is not a numbered run of the same thing,
 * which stays a section in its own right.
 */
function numbering(label) {
  const match = /^(.*?)(\d+)\s*$/.exec(label);
  if (!match || !match[1].trim()) return null;
  return { prefix: match[1], number: Number(match[2]) };
}

/**
 * Numbered headings gathered into groups of ten — 1 to 9, then 10 to 19, and
 * so on — and anything else left as a section of its own.
 *
 * Grouping by tens rather than by the file a heading happens to live in: a
 * publication's files are an artefact of how it was produced, and here they
 * hold runs of nine, six, eleven. Tens are predictable, and a reader looking
 * for question 73 knows where to open.
 *
 * Every heading appears beneath its group, including the first, so a group is
 * named for what it contains rather than borrowing its first member's name
 * and hiding it.
 */
function group(entries) {
  const grouped = [];
  /** Open groups by prefix and decade, so a run can be resumed. */
  const groups = new Map();

  for (const entry of entries) {
    const counted = numbering(entry.label);

    if (!counted) {
      grouped.push({ ...entry, children: [] });
      continue;
    }

    const key = `${counted.prefix}|${Math.floor(counted.number / 10)}`;
    const open = groups.get(key);

    // Resumed by key rather than by adjacency: a section heading in the
    // middle of a run — this book has one between questions 60 and 61 —
    // would otherwise split the decade in two.
    if (open) {
      open.children.push(entry);
      open.label = `${counted.prefix}${open.first}\u2013${counted.number}`;
      continue;
    }

    const started = {
      label: `${counted.prefix}${counted.number}`,
      href: entry.href,
      children: [entry],
      first: counted.number,
    };
    groups.set(key, started);
    grouped.push(started);
  }

  // `first` was only ever for the labelling.
  return grouped.map(({ label, href, children }) => ({
    label,
    href,
    children,
  }));
}

/**
 * The publication's headings, in reading order, grouped.
 *
 * Nesting by heading level would be truer to the markup, but publications use
 * levels decoratively — this one puts its chapter titles in `<h5>`.
 */
function outline(spine, read, href) {
  const entries = spine.flatMap((name) => {
    const markup = read(name).toString('utf8');
    return headings(markup)
      .filter((heading) => heading.id)
      .map((heading) => ({
        label: heading.label,
        href: href(name, heading.id),
        children: [],
      }));
  });

  return group(entries);
}

const navList = (entries, depth = 4) => {
  const pad = ' '.repeat(depth * 2);
  const items = entries
    .map(
      (entry) =>
        `${pad}  <li>\n${pad}    <a href="${escapeXml(
          entry.href
        )}">${escapeXml(entry.label)}</a>${
          entry.children.length
            ? `\n${navList(entry.children, depth + 2)}\n${pad}  `
            : ''
        }</li>`
    )
    .join('\n');

  return `${pad}<ol>\n${items}\n${pad}</ol>`;
};

function navPoints(entries, order = { next: 1 }, depth = 2) {
  const pad = ' '.repeat(depth * 2);

  return entries
    .map((entry) => {
      const index = order.next++;
      const children = entry.children.length
        ? `\n${navPoints(entry.children, order, depth + 1)}`
        : '';

      return (
        `${pad}<navPoint id="np-${index}" playOrder="${index}">\n` +
        `${pad}  <navLabel><text>${escapeXml(entry.label)}</text></navLabel>\n` +
        `${pad}  <content src="${escapeXml(entry.href)}"/>${children}\n` +
        `${pad}</navPoint>`
      );
    })
    .join('\n');
}

/** Swaps the contents of a delimited block, leaving the document around it alone. */
function replaceBlock(document, pattern, replacement, what) {
  if (!pattern.test(document)) {
    throw new Error(`Could not find ${what} to replace.`);
  }
  return document.replace(pattern, replacement);
}

const [source, destination] = process.argv.slice(2);
if (!source) {
  console.error('usage: node scripts/rebuild-toc.mjs <publication.epub> [output.epub]');
  process.exit(2);
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'rebuild-toc-'));

try {
  const names = entryNames(source);
  const read = unpack(source, scratch);
  const { spine, navName, ncxName } = packageDocument(read);

  if (!navName && !ncxName) {
    throw new Error('This publication declares no navigation document.');
  }

  // Navigation hrefs are relative to the document that holds them.
  const relativeTo = (owner) => (name, id) => {
    const href = path.posix.relative(path.posix.dirname(owner), name);
    return id ? `${href}#${id}` : href;
  };

  const rewritten = new Map();
  let entries = [];
  let depth = 1;

  if (navName) {
    entries = outline(spine, read, relativeTo(navName));
    depth = entries.some((entry) => entry.children.length) ? 2 : 1;

    const document = read(navName).toString('utf8');
    rewritten.set(
      navName,
      Buffer.from(
        replaceBlock(
          document,
          /(<nav\b[^>]*epub:type="toc"[^>]*>)[\s\S]*?(<\/nav>)/,
          `$1\n${navList(entries)}\n    $2`,
          'the toc nav'
        ).replace(
          /<meta name="dtb:depth" content="\d+"\/>/,
          `<meta name="dtb:depth" content="${depth}"/>`
        ),
        'utf8'
      )
    );
  }

  if (ncxName) {
    const ncxEntries = outline(spine, read, relativeTo(ncxName));
    const document = read(ncxName).toString('utf8');
    rewritten.set(
      ncxName,
      Buffer.from(
        replaceBlock(
          document,
          /<navMap>[\s\S]*?<\/navMap>/,
          `<navMap>\n${navPoints(ncxEntries)}\n  </navMap>`,
          'the ncx navMap'
        ).replace(
          /<meta name="dtb:depth" content="\d+"\/>/,
          `<meta name="dtb:depth" content="${depth}"/>`
        ),
        'utf8'
      )
    );
  }

  const archive = createArchive();
  for (const name of names) {
    archive.add(name, rewritten.get(name) ?? read(name), {
      // The EPUB container format requires this one first and uncompressed.
      store: name === 'mimetype',
    });
  }
  const bytes = archive.finish();

  const output = destination ?? source;
  const temporary = path.join(scratch, 'out.epub');
  fs.writeFileSync(temporary, bytes);
  fs.copyFileSync(temporary, output);

  // Every link has to land on an entry that exists, or the contents list is
  // worse than the two-entry one it replaced.
  const broken = [];
  const check = (entry) => {
    const [file] = entry.href.split('#');
    const resolved = path.posix.normalize(
      path.posix.join(path.posix.dirname(navName ?? ncxName), file)
    );
    if (!names.includes(resolved)) broken.push(entry.href);
    entry.children.forEach(check);
  };
  entries.forEach(check);

  const children = entries.reduce((sum, e) => sum + e.children.length, 0);
  console.log(`${path.relative(process.cwd(), output)}`);
  console.log(`  spine items     ${spine.length}`);
  console.log(`  top-level       ${entries.length}`);
  console.log(`  nested          ${children}`);
  console.log(`  depth           ${depth}`);
  console.log(`  rewrote         ${[...rewritten.keys()].join(', ')}`);
  entries.slice(0, 6).forEach((entry) => {
    console.log(`    ${entry.label.slice(0, 48).padEnd(50)} +${entry.children.length}`);
  });
  if (entries.length > 6) console.log(`    .. ${entries.length - 6} more`);

  if (broken.length) {
    console.error('\nLinks that point at nothing:');
    broken.slice(0, 10).forEach((href) => console.error(`  - ${href}`));
    process.exit(1);
  }
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}

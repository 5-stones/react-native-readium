/**
 * Just enough ZIP to rebuild an EPUB: entries land in the order they are
 * added, and each one's compression is chosen by the caller. Both matter here
 * — `mimetype` has to come first and uncompressed, and a pad entry has to be
 * stored or it would occupy no space at all.
 *
 * Reading is left to `unzip`, which every platform this runs on has; writing
 * is not, because no standard library offers the control above.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DOS_EPOCH = { time: 0, date: 0x0021 }; // 1980-01-01, for a stable build

/** The archive's entry names, in the order they appear in it. */
export function entryNames(epub) {
  return execFileSync('unzip', ['-Z1', epub], { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.endsWith('/'));
}

/** Unpacks [epub] into [into], which must already exist. */
export function unpack(epub, into) {
  execFileSync('unzip', ['-q', '-o', epub, '-d', into]);
  return (name) => fs.readFileSync(path.join(into, name));
}

export function createArchive() {
  const parts = [];
  const directory = [];
  let offset = 0;

  const push = (buffer) => {
    parts.push(buffer);
    offset += buffer.length;
  };

  /** Adds [data] as [name]; `store` writes it uncompressed. Returns its offset. */
  const add = (name, data, { store = false } = {}) => {
    const nameBytes = Buffer.from(name, 'utf8');
    const body = store ? data : zlib.deflateRawSync(data, { level: 9 });
    const method = store ? 0 : 8;
    const crc = zlib.crc32(data);
    const headerOffset = offset;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_EPOCH.time, 10);
    local.writeUInt16LE(DOS_EPOCH.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);

    push(local);
    push(nameBytes);
    push(body);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0, 8);
    entry.writeUInt16LE(method, 10);
    entry.writeUInt16LE(DOS_EPOCH.time, 12);
    entry.writeUInt16LE(DOS_EPOCH.date, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(body.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(nameBytes.length, 28);
    entry.writeUInt16LE(0, 30);
    entry.writeUInt16LE(0, 32);
    entry.writeUInt16LE(0, 34);
    entry.writeUInt16LE(0, 36);
    entry.writeUInt32LE(0, 38);
    entry.writeUInt32LE(headerOffset, 42);
    directory.push(Buffer.concat([entry, nameBytes]));

    return headerOffset;
  };

  const finish = () => {
    const directoryOffset = offset;
    directory.forEach(push);

    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(directory.length, 8);
    end.writeUInt16LE(directory.length, 10);
    end.writeUInt32LE(offset - directoryOffset, 12);
    end.writeUInt32LE(directoryOffset, 16);
    end.writeUInt16LE(0, 20);
    push(end);

    return Buffer.concat(parts);
  };

  return { add, finish };
}

// ── the bits of an EPUB these scripts have to understand ─────────────────────

/** The package document's own path, from the container. */
export function opfPath(read) {
  const container = read('META-INF/container.xml').toString('utf8');
  const href = /\bfull-path="([^"]+)"/.exec(container)?.[1];
  if (!href) throw new Error('No rootfile in META-INF/container.xml.');
  return href;
}

/**
 * What the package document says: the reading order, and where the two
 * navigation documents are. Paths are archive entry names.
 */
export function packageDocument(read, name = undefined) {
  const opfName = name ?? opfPath(read);
  const opf = read(opfName).toString('utf8');
  const base = path.posix.dirname(opfName);
  const resolve = (href) =>
    path.posix.normalize(base === '.' ? href : `${base}/${href}`);

  const items = (opf.match(/<item\b[^>]*>/g) ?? []).map((item) => ({
    id: /\bid="([^"]+)"/.exec(item)?.[1],
    href: /\bhref="([^"]+)"/.exec(item)?.[1],
    mediaType: /\bmedia-type="([^"]+)"/.exec(item)?.[1],
    properties: /\bproperties="([^"]+)"/.exec(item)?.[1] ?? '',
  }));

  const byId = new Map(items.map((item) => [item.id, item]));
  const spine = (opf.match(/\bidref="([^"]+)"/g) ?? [])
    .map((ref) => byId.get(/"([^"]+)"/.exec(ref)[1])?.href)
    .filter(Boolean)
    .map(resolve);

  const nav = items.find((item) => item.properties.split(/\s+/).includes('nav'));
  const ncx = items.find(
    (item) => item.mediaType === 'application/x-dtbncx+xml'
  );

  return {
    opfName,
    opf,
    spine,
    navName: nav ? resolve(nav.href) : null,
    ncxName: ncx ? resolve(ncx.href) : null,
  };
}

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
};

/** Markup to the text a reader would see, for a navigation label. */
export function textOf(markup) {
  return markup
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&(\w+);/g, (match, name) => ENTITIES[name] ?? match)
    .replace(/\s+/g, ' ')
    .trim();
}

export const escapeXml = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

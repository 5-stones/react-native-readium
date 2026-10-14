# React Native Readium - Next.js Example

This is a Next.js web example demonstrating the use of `react-native-readium` in a web environment using `react-native-web`.

## Features

- EPUB reader powered by Readium
- Web-based implementation using Next.js
- Shared components from `common-app` workspace
- Table of contents navigation
- Reading preferences customization
- Dark theme support

## Getting Started

### Prerequisites

- Node.js >= 20
- Yarn

### Installation

From the root of the monorepo:

```bash
yarn install
```

### Development

Run the development server:

```bash
# From the root
yarn example:nextjs dev

# Or from this directory
yarn dev
```

Open [http://localhost:3200](http://localhost:3200) with your browser to see the
result. Port 3200 rather than Next's default, so this cannot collide with an API
of your own on 3000.

### Build

Build the production bundle:

```bash
yarn build:next
```

### Analyze Bundle

To analyze the bundle size:

```bash
yarn build:analyze
```

## Project Structure

- `/pages` - Next.js pages
  - `_app.tsx` - Custom App component
  - `_document.tsx` - Custom Document component with react-native-web setup
  - `index.tsx` - Main page that loads the Reader
- `/components` - React components
  - `ReaderApp.tsx` - Main reader application component
- `/public` - Static assets
- `next.config.js` - Next.js configuration
- `react-native-shim.js` - Shim to alias react-native to react-native-web

## How It Works

This example uses `react-native-web` to render React Native components in the browser. The Next.js webpack configuration is set up to:

1. Transpile React Native packages using `transpilePackages`
2. Alias `react-native` to `react-native-web` via the shim
3. Configure proper module resolution for the monorepo structure
4. Load font files for react-native-vector-icons

The Reader component from `common-app` automatically detects the web platform and adjusts its behavior accordingly (e.g., loading EPUBs directly from URLs instead of downloading them).

## Learn More

- [React Native Readium Documentation](../../README.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Native Web Documentation](https://necolas.github.io/react-native-web/)
- [Readium Documentation](https://readium.org/)

## The example publication API

This app also serves a stand-in for a publication host that guards its files
and hands out locations that expire — the problem `resolveSource` exists for,
with nothing to sign up for. The native example app lists a book that uses it
("Moby Dick (example API)").

```
GET /api/publications/<name>        the publication's identity
GET /api/signed/<name>?exp&sig      its bytes
```

The first answers **401** without `Authorization: Bearer example-reader-token`,
and with it **302**s to a signed location that lasts **five seconds**. The
second serves the bytes with range support, and **403**s once `exp` has passed.
So a reader that holds on to a location watches it stop working, which is what
the native app's `resolveSource` is there to answer.

A few deliberate details:

- **Ranges are real**, including suffix ranges (`bytes=-65557`), because that
  is how both toolkits read a remote archive: the tail first for the central
  directory, then an entry at a time.
- **The 403 carries no CORS headers**, exactly as the hosts this stands in for
  do. That is what leaves a web reader able to see that a request failed but
  not why, and is why `SourceRequestFailure` has an `unreadable` kind.
- **Anything in `apps/example-native/resources` is served**, by filename. Drop
  a publication in there and point a book at it.

Knobs, none of which you normally need:

| | |
|---|---|
| `?ttl=<ms>` on `/api/publications/<name>` | how long the signed location lasts |
| `EXAMPLE_SIGNED_TTL_MS` | the default for the above |
| `EXAMPLE_API_TOKEN` | the token it accepts |
| `EXAMPLE_PUBLICATIONS_DIR` | where it reads publications from |

The app runs on **port 3200** so it cannot collide with an API of your own on
3000. The native app reaches it at `10.0.2.2:3200` on the Android emulator and
`localhost:3200` elsewhere; on a physical device, set `EXAMPLE_API_ORIGIN` in
`apps/common-app/src/utils/exampleApi.ts` to your machine's address on the LAN.

Nothing here is a model of good security — the token is a constant and the
signing secret has a default. It is a model of a *timing* problem.

### The streaming book

The native app's "Summa Theologica (example API)" is built for this, by:

```
yarn workspace example-nextjs make:streaming-book
```

which writes `publications/summa-theologica-streaming.epub` from the EPUB
beside it. That file is gitignored — it is 7.5 MB of mostly padding and
reproducible — so run this once before opening the book.

The EPUB beside it has had its navigation rebuilt, by:

```
yarn workspace example-nextjs rebuild-toc publications/summa-theologica.epub
```

Project Gutenberg's edition ships two contents entries for a book split across
nineteen files, which makes it useless for testing anything that navigates.
That script replaces both navigation documents — the EPUB 3 nav and the NCX —
with the headings its chapters contain — 138 entries, 114 of them nested — and
refuses to write a file whose links do not resolve.

A numbered run is gathered into groups of ten, named for what each covers
("QUESTION 20–29") and listing every member beneath, including the first.
Tens rather than one group per file: a publication's files are an artefact of
how it was produced, and this one holds runs of nine, six and eleven. Headings
that are not part of a run stay sections of their own. Nothing else in the
archive changes, and the reading order is untouched; it is already applied to
the committed file, so you only need it for a different publication.

The padding is not there to make the file big. Size alone does almost nothing:
iOS reads a remote archive through a **6 MB read-ahead window** anchored at the
last read's start, so an ordinary book's chapters, kilobytes apart, are all
covered by the first read and no page turn ever fetches again. Sequential
reading only leaves that window once per 6 MB of archive traversed. Padding the
*end* of the file changes nothing at all, since the chapters stay clustered at
the front.

So the script interleaves instead, leaving the reading order untouched and
moving only where the entries sit:

```
[ mimetype | support files | even chapters ][ 6.5 MB pad ][ odd chapters ][ tail ]
```

Chapter to chapter then alternates across the pad — 0.07 MB, 7.00 MB,
0.07 MB, 7.05 MB — so every turn lands outside the window the last one left,
in both directions. The script refuses to write a file whose closest
consecutive chapters are inside the window, or one small enough that both
toolkits would cache it whole (under 5 MB) instead of streaming it.

The trailing block is there because the last 65557 bytes are cached separately
for the ZIP central directory; without it the final chapters would be served
from that cache.

Android's window is 8 kB, so it fetches constantly and needs none of this. The
padding is what makes the same test possible on iOS.

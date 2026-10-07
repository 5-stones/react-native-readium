---
title: Web
---

# Web

On web, `ReadiumView` renders with Readium's TypeScript toolkit for EPUB and
[PDF.js](https://mozilla.github.io/pdf.js/) for PDF, through React Native Web.

## Serving publications

The web reader fetches a publication over HTTP instead of opening a file:

- **EPUB:** `file.url` is the URL of the unpacked EPUB's `manifest.json`, a
  [Readium Web Publication Manifest](https://readium.org/webpub-manifest/). A streamer serves
  one from an `.epub`; [this server](https://github.com/d-i-t-a/R2D2BC/blob/production/examples/server.ts)
  is an example.
- **PDF:** `file.url` is the PDF's URL.

## What differs from native

| Feature                 | Web                                                           |
| ----------------------- | ------------------------------------------------------------- |
| Search                  | Not supported (`capabilities.search` is false)                |
| Zoom                    | PDF only; `onZoomChange` reports the scale, including pinches |
| `file.credentials`, LCP | Not supported: LCP is native only                             |

Use `capabilities` from `onPublicationReady` to adapt the UI rather than checking the platform.

## Next.js

The [Next.js example](https://github.com/5-stones/react-native-readium/tree/main/apps/example-nextjs)
shows the setup: React Native Web, and `transpilePackages` for the library and its dependencies
in `next.config.js`.

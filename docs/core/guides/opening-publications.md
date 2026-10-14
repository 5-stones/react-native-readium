---
title: Opening publications
---

# Opening publications

`ReadiumView` opens whatever its `file` prop points to:

```tsx
<ReadiumView
  file={{
    url: localPath,
    initialLocation: savedLocator, // optional: where to start reading
  }}
  onPublicationReady={handleReady}
  onPublicationError={handleError}
/>
```

| `file` field      |                                                                                                                                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`             | iOS and Android: an `http(s)://` URL to stream, or a local path or `file://` URL to a file you downloaded; see [below](#streaming-or-downloading). Web: the URL of an unpacked EPUB's `manifest.json`, or of a PDF; see [Web](./web.md). |
| `initialLocation` | A `Locator` to open at, typically one you saved from [`onLocationChange`](./navigation.md#tracking-the-reading-position).                                                                                                                |
| `credentials`     | A secret for a protected publication, such as an LCP passphrase; see [Readium LCP](/lcp/usage#opening-a-book).                                                                                                                           |

Setting `file` to a different `url` opens that publication in the same view.

When the URL you can fetch is not the URL that identifies the publication — a signed location
that expires, or an endpoint that wants a credential — supply it with `resolveSource` instead of
putting it in `file.url`. See [Guarded sources](./guarded-sources.md).

## Streaming or downloading

On iOS and Android a publication can be read either way, and the only difference is what
`file.url` points at.

```tsx
// Streamed: read over the network, page by page.
<ReadiumView file={{ url: 'https://cdn.example.com/book.epub' }} />

// Downloaded: fetched to disk by your app first, then read from there.
<ReadiumView file={{ url: `${RNFS.DocumentDirectoryPath}/book.epub` }} />
```

**Streaming** opens immediately and stores nothing. The toolkits fetch byte ranges as the reader
moves, so only what's read is transferred — though an archive under 5 MB is small enough that it's
fetched and held whole when it opens. Reading needs the network to stay reachable, and if the URL
carries a credential that expires, [`resolveSource`](./guarded-sources.md) is how it gets
replaced.

**Downloading** is your app's job: fetch the file with whatever you already use, then point
`file.url` at the path. The reader then works offline, nothing expires mid-chapter, and page turns
never wait on a request — at the cost of storage and of waiting for the whole book before any of
it can be read. A guarded download endpoint is yours to authenticate, since the library isn't
making that request.

Nothing in the view changes between the two, so an app can offer both: stream to start reading
now, download for later.

Web has no choice to make — the browser fetches everything, and there's no filesystem to download
to.

## When the publication is ready

`onPublicationReady` fires once the publication is open, with what you need to build the
reader's UI:

```tsx
const handleReady = (event: PublicationReadyEvent) => {
  event.metadata.title; // title, author, language, …
  event.tableOfContents; // Link[], nested through `children`
  event.positions; // Locator[], one per position in the book
  event.capabilities; // which preferences apply; see Preferences
  event.isProtected; // true when DRM unlocked it
};
```

See [Preferences](./preferences.md#knowing-which-preferences-apply) for `capabilities`, and
[`PublicationReadyEvent`](../api/interfaces/PublicationReadyEvent.md)
for every field.

## When it can't be opened

`onPublicationError` fires instead, with a `code` saying why; see [Handling errors](./errors.md).

An open that's superseded by a newer `file` reports nothing. After a `restricted` or `cancelled`
error, setting `file` again with different `credentials` retries the open; re-rendering with the
same `url` and `credentials` doesn't.

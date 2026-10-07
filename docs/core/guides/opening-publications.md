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

| `file` field      |                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`             | iOS and Android: a local path or `file://` URL to an EPUB or PDF. Web: the URL of an unpacked EPUB's `manifest.json`, or of a PDF; see [Web](./web.md). |
| `initialLocation` | A `Locator` to open at, typically one you saved from [`onLocationChange`](./navigation.md#tracking-the-reading-position).                               |
| `credentials`     | A secret for a protected publication, such as an LCP passphrase; see [Readium LCP](/lcp/usage#opening-a-book).                                          |

Setting `file` to a different `url` opens that publication in the same view.

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

# ReadiumFile

The publication a `ReadiumView` opens.

## Properties

### url

```ts
url: string;
```

Where the publication is.

iOS and Android take either an `http(s)://` URL, read over the network as
the reader turns pages, or a local path or `file://` URL to a file you
downloaded yourself. Web takes the URL of an unpacked EPUB's
`manifest.json`, or of a PDF.

With `resolveSource` set this is the publication's identity rather than
somewhere to fetch from, and is never fetched.

***

### initialLocation?

```ts
optional initialLocation?: Locator;
```

Where to start reading, e.g. a locator saved from `onLocationChange`.

***

### credentials?

```ts
optional credentials?: string;
```

Handed to the registered content protections when the publication is opened, e.g. an LCP
passphrase or its SHA-256 hex hash. Ignored by unprotected publications and on web.

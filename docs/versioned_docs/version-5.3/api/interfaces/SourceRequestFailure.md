# SourceRequestFailure

A request the library made for the publication, which failed.

The same object everywhere: what iOS and Android report about a failed
read, what a web navigator reports about a failed fetch, and what
`shouldRefreshSource` is asked about.

## Properties

### url

```ts
url: string;
```

The url that was requested.

***

### status?

```ts
optional status?: number;
```

The HTTP status, when one could be read. On web it often cannot be: a
storage host that sends CORS headers on success but not on errors leaves
the browser reporting a bare network failure, with the status withheld.
Branch on `kind` rather than relying on this.

***

### kind

```ts
kind: PublicationErrorKind;
```

What was observed.

- `http` — a response arrived and `status` is set.
- `unreadable` — the request failed without a readable status. A refused
  credential looks like this whenever the host omits CORS headers from its
  error responses, and so does being offline.

***

### detail?

```ts
optional detail?: string;
```

The platform's own description of the failure, for logs.

# ResolveSourceRequest

What `resolveSource` is being asked to resolve.

An object rather than a bare url so that what is known about a request can
grow without changing the signature.

## Properties

### url

```ts
url: string;
```

The `file.url` a location is wanted for — the publication's identity,
which the library holds and never fetches while `resolveSource` is set.

***

### reason

```ts
reason: SourceRequestReason;
```

Whether this is the first location for the publication, or a replacement
for one that stopped working.

# PublicationSource

Where a publication's bytes are, as opposed to which publication it is.

Separate from `file.url` because a location can change — a credential in it
expires, a download is replaced — without the publication having changed.

## Properties

### url

```ts
url: string;
```

Where to read the publication from, now.

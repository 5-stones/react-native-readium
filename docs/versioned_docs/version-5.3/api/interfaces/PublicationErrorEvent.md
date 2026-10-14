# PublicationErrorEvent

Something went wrong with a publication; `code` says what.

Branch on `stage` before deciding how bad it is. `'open'` means the
publication could not be opened, and fires instead of a ready event.
`'read'` means it is open and intact, and one request for its bytes failed
and was not recovered — worth a retry, not worth tearing the reader down
for.

Every field but `message` comes from the platform that reported the
failure; `message` is the wording that goes with `code`, filled in on the
way out so that it reads the same everywhere.

## Properties

### url

```ts
url: string;
```

The `file.url` the failure is about.

***

### code

```ts
code: PublicationErrorCode;
```

Why, the same on every platform: branch on it, or map it to your own localized text.

***

### stage

```ts
stage: PublicationErrorStage;
```

How bad it is: whether there is a publication to read at all.

Branch on this before deciding what to do. `'open'` fires instead of
`onPublicationReady`; `'read'` leaves the publication open and the reader
where they were, so it is worth a retry and not worth a teardown.

***

### message

```ts
message: string;
```

A default English description of `code`, the same on every platform.

The one field here the platforms do not report: they pass an empty string
and JS fills it in from `code` on the way out, so that the wording lives
in one place rather than three. Always set by the time a consumer sees
the event.

***

### detail?

```ts
optional detail?: string;
```

The platform's own description of what went wrong, for logs. Varies by platform.

***

### protectionScheme?

```ts
optional protectionScheme?: string;
```

For a protected publication, its DRM scheme's URI.

***

### status?

```ts
optional status?: number;
```

For a read failure, the HTTP status where the failure was a response.

***

### kind?

```ts
optional kind?: PublicationErrorKind;
```

For a read failure, whether a status was readable at all.

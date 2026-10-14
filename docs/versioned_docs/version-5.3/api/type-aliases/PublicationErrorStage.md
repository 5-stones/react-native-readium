# PublicationErrorStage

```ts
type PublicationErrorStage = "open" | "read";
```

Whether a publication failed to open, or failed to be read after it was
open.

`'read'` is not fatal: what the reader is looking at is intact, and one
request for the publication's bytes failed and was not recovered.

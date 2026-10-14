---
title: Handling errors
---

# Handling errors

`onPublicationError` reports anything that went wrong with a publication — whether it could not
be opened at all, or was open and a request for its bytes failed. Branch on `stage` before
deciding how bad it is:

```tsx
<ReadiumView
  file={file}
  onPublicationError={(event) => {
    console.warn(event.stage, event.code, event.detail);

    // 'open': there is nothing to read. 'read': the publication is open and
    // intact, and one request for its bytes was lost.
    if (event.stage === 'open') setError(event.message);
    else setBanner(event.message);
  }}
/>
```

| Field              |                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `stage`            | `'open'` if the publication could not be opened, `'read'` if it is open and a request for its bytes failed. |
| `code`             | Why, the same on every platform. Branch on it, or map it to your own localized text.                        |
| `message`          | A default English description of `code`, the same on every platform.                                        |
| `detail`           | The platform's own description of what went wrong, for logs. It varies by platform.                         |
| `url`              | The `file.url` that failed.                                                                                 |
| `protectionScheme` | For a protected publication, its DRM scheme's URI.                                                          |
| `status`           | For a `'read'` failure, the HTTP status, where one could be read.                                           |
| `kind`             | For a `'read'` failure, `'http'` when a status arrived and `'unreadable'` when none could be read.          |

| `code`                   | `message`                                                          |
| ------------------------ | ------------------------------------------------------------------ |
| `fileNotFound`           | The publication file couldn't be found.                            |
| `formatNotSupported`     | This publication's format isn't supported.                         |
| `openFailed`             | The publication couldn't be opened.                                |
| `protectionNotSupported` | This publication is protected with a DRM this app doesn't support. |
| `restricted`             | Access to this publication was refused.                            |
| `cancelled`              | Opening the publication was cancelled.                             |
| `readFailed`             | Part of this publication couldn't be loaded.                       |

`describePublicationError(code)` returns the same `message` for a code you already have.

## Failures while reading

A `readFailed` event — the only one with `stage: 'read'` — means the publication is open, the page
on screen is intact, and one request for its bytes was given up on. It is worth offering a retry
and not worth tearing the reader down for.

You only see these where [`resolveSource`](./guarded-sources.md) is set, since without it the
library has nothing to ask for a new location, and at most once per location until a request
succeeds. [Guarded sources](./guarded-sources.md#when-it-gives-up) covers what to do with
one.

## Protected publications

- `protectionNotSupported`: no registered content protection handles the publication's DRM. For
  LCP, install and initialize [`react-native-readium-lcp`](/lcp).
- `restricted`: a protection handles it but refused access, for example an expired loan or a
  wrong passphrase.
- `cancelled`: access was refused without an error, for example when the user dismissed the
  passphrase prompt.

After `restricted` or `cancelled`, setting `file` again with different `credentials` retries the
open.

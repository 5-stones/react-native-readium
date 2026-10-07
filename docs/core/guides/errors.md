---
title: Handling errors
---

# Handling errors

When a publication can't be opened, `onPublicationError` fires instead of `onPublicationReady`:

```tsx
<ReadiumView
  file={file}
  onPublicationError={(event) => {
    console.warn(event.code, event.detail);
    setError(event.message);
  }}
/>
```

| Field              |                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------ |
| `code`             | Why, the same on every platform. Branch on it, or map it to your own localized text. |
| `message`          | A default English description of `code`, the same on every platform.                 |
| `detail`           | The platform's own description of what went wrong, for logs. It varies by platform.  |
| `url`              | The `file.url` that failed.                                                          |
| `protectionScheme` | For a protected publication, its DRM scheme's URI.                                   |

| `code`                   | `message`                                                          |
| ------------------------ | ------------------------------------------------------------------ |
| `fileNotFound`           | The publication file couldn't be found.                            |
| `formatNotSupported`     | This publication's format isn't supported.                         |
| `openFailed`             | The publication couldn't be opened.                                |
| `protectionNotSupported` | This publication is protected with a DRM this app doesn't support. |
| `restricted`             | Access to this publication was refused.                            |
| `cancelled`              | Opening the publication was cancelled.                             |

`describePublicationError(code)` returns the same `message` for a code you already have.

## Protected publications

- `protectionNotSupported`: no registered content protection handles the publication's DRM. For
  LCP, install and initialize [`react-native-readium-lcp`](/lcp).
- `restricted`: a protection handles it but refused access, for example an expired loan or a
  wrong passphrase.
- `cancelled`: access was refused without an error, for example when the user dismissed the
  passphrase prompt.

After `restricted` or `cancelled`, setting `file` again with different `credentials` retries the
open.

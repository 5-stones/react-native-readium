---
title: Usage
---

# Using LCP

Everything below goes through the `LCP` object. The [`LcpModule`](./api/interfaces/LcpModule.md)
reference documents each of its methods.

## At startup

Initialize LCP once, before any `ReadiumView` is given an LCP book, and connect your passphrase
UI:

```tsx
import { LCP } from 'react-native-readium-lcp';

// Resolves false when the app was built without liblcp.
const available = await LCP.initialize();

// Your passphrase UI, or your backend. Resolve undefined to give up.
LCP.setAuthenticationHandler(async ({ reason, hint, provider }) =>
  reason === 'passphraseNotFound'
    ? await api.passphraseHashFor(provider)
    : await promptForPassphrase({ hint, wrong: true })
);
```

`initialize` takes optional `deviceName` and `deviceId`, which identify the device to license
servers when a license is registered. `deviceId` is generated and stored when you leave it out.

## Answering passphrase requests

Readium calls the handler when a license needs its passphrase, while opening a book or reading a
license. The request carries `reason` (`passphraseNotFound`, or `invalidPassphrase` after a wrong
attempt), the license's `hint` and `hintLink`, its `provider`, and the user's details when the
license has them.

Resolve with the passphrase, either in clear text or as its SHA-256 hex hash, or with `undefined`
to give up. Call `LCP.setAuthenticationHandler()` with no handler to remove it.

:::warning Always settle the promise
Readium waits on the handler while it opens a book or reads a license. Resolve `undefined` when the
user cancels, when a newer request replaces the prompt, or when the screen showing the prompt
goes away. A promise that never settles leaves the open or `getLicense` waiting forever.
:::

On iOS, show the prompt somewhere it can actually appear: a React Native `Modal` can't be
presented over another `Modal`, so a prompt opened from a modal screen never shows and the request
hangs.

## Acquiring a publication

A license file (`.lcpl`) points to its publication. `acquirePublication` downloads the publication
and injects the license into it:

```tsx
const { localPath, suggestedFilename, licenseId } =
  await LCP.acquirePublication(
    { url: lcplUrl }, // or { path: lcplPath } or { json: lcplText }
    { onProgress: (fraction) => setProgress(fraction) }
  );
```

The publication is downloaded to a temporary location: move it somewhere your app keeps books.

A revoked, returned, cancelled or expired license is rejected before anything is downloaded
(`licenseRevoked`, …). That costs one request to the license server; pass `checkStatus: false` to
skip it.

To add a license to a publication your app downloaded itself, use
`LCP.injectLicense(licenseJSON, publicationPath)`.

## Opening a book

An LCP book opens like any other file:

```tsx
<ReadiumView file={{ url: bookPath }} />
```

Readium asks the authentication handler for the passphrase if it doesn't already have it. To skip
the prompt with a passphrase the app already knows, pass it as `credentials`, preferably as its
SHA-256 hex hash:

```tsx
<ReadiumView file={{ url: bookPath, credentials: passphraseHash }} />
```

Like any prop, `credentials` is visible to React DevTools, so don't log it.

A book that can't be unlocked reports `restricted` (or `cancelled`) through
[`onPublicationError`](/docs/guides/errors).

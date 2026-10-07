---
title: Readium LCP
sidebar_label: Overview
slug: /
---

# Readium LCP

[Readium LCP](https://www.edrlab.org/readium-lcp/) is the DRM used by many libraries and
bookstores to lend and sell ebooks. `react-native-readium-lcp` adds it to `react-native-readium`
on iOS and Android.

It wraps Readium's LCP module (`ReadiumLCP` on iOS, `readium-lcp` on Android) and registers it
with the reader. From JS, you:

- acquire a publication from a license file (`.lcpl`);
- answer passphrase requests with your own UI;
- read a license's loan and rights, and renew or return it.

Decryption stays native, so protected books read as fast as unprotected ones.

## Requirements

- `react-native-readium` 5.3.0 or later.
- **liblcp**, EDRLab's private pre-compiled library (`R2LCPClient` on iOS). This package can't
  ship it: [contact EDRLab](https://www.edrlab.org/contact/) for it and for its integration
  instructions. They provide test and production builds.
- iOS or Android. LCP isn't available on web.

## How it fits together

Everything goes through the package's `LCP` object, an
[`LcpModule`](./api/interfaces/LcpModule.md): `import { LCP } from 'react-native-readium-lcp'`.

1. Your build links liblcp, using the values from EDRLab's instructions;
   see [Installation](./installation.md).
2. At startup, `LCP.initialize()` registers LCP with the reader and `LCP.setAuthenticationHandler`
   connects your passphrase UI; see [Usage](./usage.md).
3. `LCP.acquirePublication` downloads a book from its license, and `ReadiumView` opens it like any
   other file.

## Known limitations

- Passphrase prompts are always your JS UI; Readium's native dialogs aren't used.
- A loan that can only be renewed through the provider's web page fails with `renewFailed`.
- On Android, Readium disables text selection in protected publications, so they can't be
  highlighted.
- Web isn't supported.

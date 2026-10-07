---
title: Errors
---

# LCP errors

Every `LCP` call rejects with an `LcpError`:

```ts
import { LCP, LcpError } from 'react-native-readium-lcp';

try {
  await LCP.acquirePublication({ url });
} catch (e) {
  if (e instanceof LcpError) Alert.alert("Couldn't add this book", e.message);
}
```

| Field                                  |                                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `code`                                 | An `LcpErrorCode`, the same on both platforms. Branch on it.                                     |
| `message`                              | Plain English, written for users: "This license was revoked by its provider on October 1, 2026." |
| `date`, `devicesCount`, `maxRenewDate` | What the message mentions, for apps that word or translate it themselves.                        |
| `detail`                               | Readium's own description, for logs.                                                             |

`describeLcpError(code, details)` returns the same message for a code you already have, such as a
license's `restriction`.

A book that can't be unlocked while reading is reported by the reader, through `ReadiumView`'s
[`onPublicationError`](/docs/guides/errors), as `restricted` or `protectionNotSupported`.

## Codes

### The license

| Code                             | Meaning                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| `licenseRevoked`                 | The provider revoked the license.                                  |
| `licenseReturned`                | The book was returned.                                             |
| `licenseCancelled`               | The license was cancelled.                                         |
| `licenseExpired`                 | The loan ended.                                                    |
| `licenseNotStarted`              | The loan hasn't started yet.                                       |
| `licenseIntegrity`               | The license is damaged, or wasn't issued by a trusted provider.    |
| `licenseProfileNotSupported`     | The license uses an LCP profile the linked liblcp doesn't support. |
| `missingPassphrase`              | No passphrase was given.                                           |
| `notALicenseDocument`, `parsing` | Not a valid LCP license.                                           |
| `licenseIsBusy`                  | The license is in use; try again.                                  |
| `licenseContainer`               | The license couldn't be read from or written to the book's file.   |
| `licenseInteractionNotAvailable` | The license needs an action that isn't available.                  |

### Loans

| Code                       | Meaning                                           |
| -------------------------- | ------------------------------------------------- |
| `invalidRenewalPeriod`     | The requested end date is past `maxRenewDate`.    |
| `renewFailed`              | The loan couldn't be renewed.                     |
| `alreadyReturnedOrExpired` | The book was already returned, or its loan ended. |
| `returnFailed`             | The book couldn't be returned.                    |

### Network

| Code          | Meaning                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| `network`     | The license server couldn't be reached.                                                                      |
| `crlFetching` | The certificate revocation list couldn't be downloaded. Check the [cleartext HTTP setup](./installation.md). |

### Setup and platform

| Code                                             | Meaning                                                                 |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| `notInitialized`                                 | Call `LCP.initialize()` first.                                          |
| `registryUnavailable`                            | LCP couldn't connect to `react-native-readium`.                         |
| `unsupported`                                    | Not available on this platform, such as `forgetPassphrases` on Android. |
| `openFailed`                                     | The file couldn't be opened.                                            |
| `addPassphraseFailed`, `forgetPassphrasesFailed` | Storing or removing passphrases failed.                                 |
| `unknown`                                        | Anything else; see `detail`.                                            |

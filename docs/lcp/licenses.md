---
title: Licenses and loans
---

# Licenses and loans

## Reading a license

```ts
const license = await LCP.getLicense(bookPath);
```

| Field                                      |                                                                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `id`, `provider`                           | The license and who issued it.                                                                                  |
| `issued`, `updated`                        | `Date`s.                                                                                                        |
| `start`, `end`                             | The loan window, when the license has one.                                                                      |
| `status`                                   | `'ready'`, `'active'`, `'revoked'`, `'returned'`, `'cancelled'` or `'expired'`.                                 |
| `charactersToCopyLeft`, `pagesToPrintLeft` | Rights left; `undefined` when unlimited.                                                                        |
| `canRenewLoan`, `maxRenewDate`             | Whether, and until when, the loan can be renewed.                                                               |
| `canReturnPublication`                     | Whether the book can be returned early.                                                                         |
| `restriction`                              | Why the book can't be read with this license, if it can't, such as `licenseExpired`; see [Errors](./errors.md). |

`getLicense` may ask the authentication handler for the passphrase. Pass
`{ allowUserInteraction: false }` to read only what doesn't need it.

## Renewing and returning

```ts
if (license.canRenewLoan) {
  const renewed = await LCP.renewLoan(bookPath, { preferredEndDate });
}

if (license.canReturnPublication) {
  await LCP.returnPublication(bookPath);
}
```

Without `preferredEndDate`, the provider picks the new end date.

## Stored passphrases

Readium remembers passphrases and licenses on the device:

| What                                                         | Where                              | Reset                                |
| ------------------------------------------------------------ | ---------------------------------- | ------------------------------------ |
| Passphrase hashes                                            | iOS Keychain; Android app database | `LCP.forgetPassphrases()` (iOS only) |
| Licenses: device registration and consumed print/copy rights | iOS Keychain; Android app database | Not exposed                          |

Every stored passphrase is tried against each new license, so once a user's passphrase is known,
their other books from the same provider open without asking. Call `forgetPassphrases()` when the
user signs out or hands the device to someone else; each license then asks again.

To store a passphrase ahead of time, call `LCP.addPassphrase(passphrase, { isHashed })` (iOS only).

Licenses can't be cleared on purpose: that would give back print and copy rights a user has spent.
Deleting a book is just deleting its file.

### Platform differences

On Android, readium-lcp keeps its passphrase store internal, so `addPassphrase` and
`forgetPassphrases` reject with `unsupported`; clearing the app's data is the only reset. Check
`LCP.capabilities` to offer only what the platform supports:

```tsx
function ForgetPassphrasesButton() {
  if (!LCP.capabilities.forgetPassphrases) return null;
  return (
    <Button
      title="Forget passphrases"
      onPress={() => LCP.forgetPassphrases()}
    />
  );
}
```

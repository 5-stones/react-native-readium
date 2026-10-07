# react-native-readium-lcp

[Readium LCP](https://www.edrlab.org/readium-lcp/) DRM for
[`react-native-readium`](../react-native-readium), on iOS and Android.

It wraps Readium's LCP module (`ReadiumLCP` on iOS, `readium-lcp` on Android), registers its
content protection with `react-native-readium`, and exposes acquisition, licenses, loans and
passphrase prompts to JS. Decryption stays native, so reading performs as in a native Readium app.

> **Status:** 0.1.0, early. The API may change before 1.0.

## Requirements

- `react-native-readium` with the content protection registry (5.3.0 or later).
- **liblcp** (`R2LCPClient` on iOS), EDRLab's private pre-compiled library, which this package
  can't ship. [Contact EDRLab](https://www.edrlab.org/contact/) for it and for its integration
  instructions; they provide test and production builds.

## Installation

```sh
yarn add react-native-readium-lcp
```

Each platform's build links liblcp when you tell it where to find it, using EDRLab's
instructions; leave it unset to build without liblcp, and LCP reports itself unavailable at
runtime. Set it in the environment, or in a `.env` file at your app's root (next to `ios/` and
`android/`) that you keep out of version control:

```sh
# .env
READIUM_LCP_IOS_PODSPEC=<R2LCPClient podspec URL from EDRLab>
READIUM_LCP_ANDROID_AAR=<path to the liblcp .aar from EDRLab>
```

The environment wins over `.env`, and a blank value counts as unset. `.env` support is
deliberately small: `KEY=value` lines, with optional `export` and quotes, and no interpolation.
Switching between EDRLab's test and production libs is a matter of changing these values.

### iOS

Call `readium_lcp_pods` in your Podfile's target, next to `react-native-readium`'s
`readium_pods`:

```ruby
target 'MyApp' do
  config = use_native_modules!
  # ...
  readium_pods
  readium_lcp_pods
  # ...
end
```

It adds `R2LCPClient` from `READIUM_LCP_IOS_PODSPEC`; pass `readium_lcp_pods(podspec: '…')` to
override the environment and `.env`. Rerun `pod install` after changing the URL.

The URL is private to your app, so `Podfile.lock` records it as
`READIUM_LCP_IOS_PODSPEC_REDACTED`, and CocoaPods fetches the podspec again on each install. To
keep the real URL there instead, pass `readium_lcp_pods(redact_lockfile: false)`.

When liblcp is linked, this package adapts and registers it itself; no app code is needed.

Readium downloads EDRLab's certificate revocation list over plain HTTP, so allow that one host
in your `Info.plist`; without it, every license fails to open:

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSExceptionDomains</key>
  <dict>
    <key>crl.edrlab.telesec.de</key>
    <dict>
      <key>NSExceptionAllowsInsecureHTTPLoads</key>
      <true/>
    </dict>
  </dict>
</dict>
```

#### Linking liblcp without CocoaPods

If your app adds `R2LCPClient` another way (Swift Package Manager, Carthage, or a framework added
in Xcode), this package's pod can't see it, so it can't adapt it for you: LCP reports itself
unavailable until you register an adapter at launch. Skip `readium_lcp_pods` in that case.

This package's Swift module can't be imported from an app (its Nitro headers are C++), so declare
its registry in your bridging header:

```objc
#import <Foundation/Foundation.h>

@interface RNRLCPClientRegistry : NSObject
+ (BOOL)registerClient:(id)client;
@end
```

Then adapt `R2LCPClient` to Readium's `LCPClient` and register it:

```swift
import R2LCPClient
import ReadiumLCP

final class LiblcpClient: ReadiumLCP.LCPClient {
  func createContext(jsonLicense: String, hashedPassphrase: LCPPassphraseHash, pemCrl: String) throws -> LCPClientContext {
    try R2LCPClient.createContext(jsonLicense: jsonLicense, hashedPassphrase: hashedPassphrase, pemCrl: pemCrl)
  }

  func decrypt(data: Data, using context: LCPClientContext) -> Data? {
    R2LCPClient.decrypt(data: data, using: context as! DRMContext)
  }

  func findOneValidPassphrase(jsonLicense: String, hashedPassphrases: [LCPPassphraseHash]) -> LCPPassphraseHash? {
    R2LCPClient.findOneValidPassphrase(jsonLicense: jsonLicense, hashedPassphrases: hashedPassphrases)
  }
}

// In application(_:didFinishLaunchingWithOptions:), before JS calls LCP.initialize()
RNRLCPClientRegistry.registerClient(LiblcpClient())
```

A registered client always takes precedence over the one `readium_lcp_pods` links, so the same
call also swaps in any other `LCPClient`, such as a test client.

### Android

Apply this package's Gradle script in `android/app/build.gradle`:

```groovy
apply from: "../../node_modules/react-native-readium-lcp/android/liblcp.gradle"
```

It links the `.aar` at `READIUM_LCP_ANDROID_AAR`. A relative path is resolved against your app's
root. To set it in Gradle instead, use the `readiumLcpAar` property (in `gradle.properties` or
with `-PreadiumLcpAar`); it takes precedence over the environment and `.env`.

#### If your app has its own network security config

This package's manifest sets a network security config that allows cleartext HTTP, which LCP
needs. If your app sets its own `android:networkSecurityConfig`, replace this package's:

```xml
<application
  xmlns:tools="http://schemas.android.com/tools"
  android:networkSecurityConfig="@xml/network_security_config"
  tools:replace="android:networkSecurityConfig">
```

and allow cleartext in your config, or no license will open (`crlFetching`):

```xml
<network-security-config>
  <base-config cleartextTrafficPermitted="true" />
</network-security-config>
```

## Usage

```tsx
import { LCP } from 'react-native-readium-lcp';
import { ReadiumView } from 'react-native-readium';

// Once, at startup, before any ReadiumView is given an LCP file.
const available = await LCP.initialize(); // false when the app doesn't ship liblcp

// Your own passphrase UI, or your backend. Resolve null to give up.
LCP.setAuthenticationHandler(async ({ reason, hint, provider }) =>
  reason === 'passphraseNotFound'
    ? await api.passphraseHashFor(provider)
    : await promptForPassphrase({ hint, wrong: true })
);

// Download the publication an LCPL points to, with its license injected. A revoked, returned,
// cancelled or expired license is rejected first (`licenseRevoked`, …), before any download;
// pass `checkStatus: false` to skip that request to the license server.
const { localPath } = await LCP.acquirePublication(
  { url: lcplUrl }, // or { path } or { json }
  { onProgress: (fraction) => setProgress(fraction) }
);

<ReadiumView file={{ url: localPath }} />;
```

Readium waits on the handler's promise while it opens a book or reads a license, so it must
always settle: resolve `null` when the user cancels, when a newer request replaces the prompt,
or when the screen showing the prompt goes away. A promise that never settles leaves that open
or `getLicense` waiting forever. On iOS, also show the prompt somewhere it can actually appear:
a React Native `Modal` can't be presented over another `Modal`, so a prompt opened from a
modal screen never shows and the request hangs.

A passphrase the app already knows can also go straight to the reader, so the handler isn't
called: `<ReadiumView file={{ url: localPath, credentials: passphraseHash }} />`.

### Licenses and loans

```ts
const license = await LCP.getLicense(localPath);
// { provider, status, issued, start, end, charactersToCopyLeft, pagesToPrintLeft,
//   canRenewLoan, maxRenewDate, canReturnPublication, ... }

if (license.canRenewLoan) await LCP.renewLoan(localPath, { preferredEndDate });
if (license.canReturnPublication) await LCP.returnPublication(localPath);
```

`LCP.injectLicense(licenseJSON, path)` adds a license to a publication the app downloaded itself,
and `LCP.addPassphrase(passphrase, { isHashed })` stores a passphrase ahead of time (iOS only:
readium-lcp 3.3 keeps Android's store internal). See [Stored state](#stored-state-and-resetting-it)
for `LCP.forgetPassphrases()`.

### Stored state and resetting it

Readium stores two things on the device, and they reset differently:

| What | Where | Reset |
| --- | --- | --- |
| Passphrase hashes | iOS Keychain; Android app database | `LCP.forgetPassphrases()` (iOS only) |
| Licenses: device registration and consumed print/copy rights | iOS Keychain; Android app database | Not exposed |

Any stored passphrase is tried against every new license, so once a user's passphrase is known,
their other books from the same provider open without asking. Call `forgetPassphrases()` when
the user signs out or hands the device to someone else; each license then asks again.

Licenses can't be cleared on purpose: that would give back the print and copy rights a user has
spent. Deleting a book is just deleting its file.

On Android, readium-lcp 3.3 keeps its passphrase store internal, so `forgetPassphrases()` rejects
with `unsupported` there. Clearing the app's data is the only way to reset it. Check
`LCP.capabilities` (`forgetPassphrases`, `addPassphrase`) to only offer what the platform can do.

### Errors

Every call rejects with an `LcpError`:

| Field | |
| --- | --- |
| `code` | An `LcpErrorCode`, e.g. `licenseRevoked`, `licenseExpired`, `missingPassphrase`, `network`. Defined in the Nitro spec, so both platforms report the same set |
| `message` | Plain English, written for users: "This license was revoked by its provider on October 1, 2026." |
| `date`, `devicesCount`, `maxRenewDate` | What the message mentions, for apps that word or translate it themselves |
| `detail` | Readium's own description, for logs |

```ts
try {
  await LCP.acquirePublication({ url });
} catch (e) {
  if (e instanceof LcpError) Alert.alert("Couldn't add this book", e.message);
}
```

`describeLcpError(code, details)` gives the same message for a code you already have, such as a
license's `restriction`: `getLicense` describes a license even when its book can't be read, with
`restriction` saying why (`licenseRevoked`, `missingPassphrase`, …).

A book that can't be unlocked while reading is reported by the reader itself, through
`ReadiumView`'s `onPublicationError` (`restricted` or `protectionNotSupported`).

## Known limitations

- Prompts are always JS: Readium's native passphrase dialogs aren't used.
- A loan that can only be renewed through the provider's web page fails with `renewFailed`.
- On Android, kotlin-toolkit can't combine LCP and highlights; EDRLab documents an escape hatch.
- Web isn't supported; LCP is native only.

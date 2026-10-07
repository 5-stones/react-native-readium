# Example App

The example app is used as the basis of building and testing the core library.
If you have an issue that we're unable to reproduce easily, we'll likely ask you
to come here, build and run the example app, and see if you can reproduce it
in that app.

## Building & Running

The most important thing to know about how to run this project, is to understand
that it installs the `react-native-readium` library located in the parent
directory (`../`) and **NOT from npm**. This means that before you can properly
run the `example` you need to build the core library. Similarly, if you make a
change to the code located in the parent directory, you need to rebuild then
reinstall it in the `example` directory.

Here are the steps:

### 1. Bootstrap The Library

All commands are going to be run from the root directory. Meaning relative to
this file you should run them from `../`.

`yarn bootstrap`

The bootstrap command builds the parent project and installs it in the `example`.

### 2. Running The App

All commands are going to be run from the root directory. Meaning relative to
this file you should run them from `../`.

**Start Metro**

`yarn example start`

**Run iOS or Android**

`yarn example [android | ios]`

Ex. `yarn example ios`.

Thats it! :tada:, you should now be running the example project.

### 3. Readium LCP (optional)

The app always includes `react-native-readium-lcp`. Debug builds without liblcp use a
stand-in client that only opens test licenses (see [Testing LCP without liblcp](#4-testing-lcp-without-liblcp));
release builds without liblcp report "Unavailable" on the LCP tab, whose **Client** line shows
which one you have.

To use EDRLab's liblcp instead, test or production, configure it in `apps/example-native/.env`.
liblcp and its integration instructions are private to EDRLab's partners, so none of it is in this
repo: copy `.env.default` to `.env` (gitignored) and fill in the values from EDRLab's instructions.
Variables set in the shell override the file. These are `react-native-readium-lcp`'s own settings,
read by its `readium_lcp_pods` and `liblcp.gradle`; see its README.

| Variable | Platform | Value |
| --- | --- | --- |
| `READIUM_LCP_IOS_PODSPEC` | iOS | The `R2LCPClient` podspec URL |
| `READIUM_LCP_ANDROID_AAR` | Android | Path to the liblcp `.aar`, absolute or relative to this folder |

On iOS, rerun `pod install` after changing `.env`. Android picks up changes on the next build.

Linking liblcp is local to you: with it linked, `Podfile.lock` and the Xcode project list
`R2LCPClient` (the podspec URL itself is redacted), so don't commit them. A pre-commit hook
(`scripts/check-liblcp-leaks.js`, installed by `yarn`) refuses commits that include them or your
podspec URL, and CI runs the same check. To commit iOS project changes, rerun `pod install` with
`READIUM_LCP_IOS_PODSPEC` unset first.

To switch between the test and production libs, change the values in `.env` and rebuild.

A test build of liblcp opens only test licenses, such as the bundled Daisy book and front-test
purchases; the generated Moby Dick has no valid signature, so it fails with `licenseIntegrity`.

In the app's **LCP** tab, paste an LCPL URL (or an absolute path to an `.lcpl` on the device)
and tap **Acquire publication**. The book joins the tab's list; tap it to read, entering its
passphrase when asked, or open **License** to see the loan and renew or return it.

#### Testing with a book from EDRLab's test server

[front-test.edrlab.org](https://front-test.edrlab.org/) is EDRLab's test bookstore. Its licenses
use LCP's basic profile, so a debug build opens them without liblcp (EDRLab's *test* liblcp does
too; a production liblcp refuses them). Tap **ⓘ** next to the LCPL field on the app's **LCP** tab
for the steps: create a user, buy a book, and enter the purchase number to fill in its license
URL (`https://front-test.edrlab.org/frontend/api/v1/purchases/<number>/license`).

A license is checked with the server before its book is downloaded, so a revoked, returned or
expired one fails at **Acquire publication** (`licenseRevoked`, …), not when it's opened.
**Renew** and **Return** only appear for loans; a purchase has neither.

If opening fails:

| Error | Cause |
| --- | --- |
| `restricted: crlFetching` (iOS) | The app can't download EDRLab's revocation list over HTTP; the app's `Info.plist` must allow `crl.edrlab.telesec.de` |
| `restricted: licenseProfileNotSupported` | A production license: neither the debug stand-in nor EDRLab's test lib opens it; it needs a production lib |
| `protectionNotSupported` | No LCP client at all (**Client: None**) |
| `restricted` after cancelling the prompt | Expected: no passphrase, no book |

### 4. Testing LCP without liblcp

Debug builds without liblcp include a stand-in client for LCP's open *basic profile*
(`ios/BasicProfileLCPClient.swift`, `android/app/src/lcpTestClient`). It opens the two bundled
test books, **Daisy (LCP PDF)** (an EDRLab test-server license) and **Moby Dick (LCP EPUB)**
(generated by `scripts/make-lcp-fixture.js`), with the passphrase `test`. It checks no signatures
and refuses every other profile, so it never ships and never opens a production license.

### Resetting LCP state by hand

| To | iOS | Android |
| --- | --- | --- |
| Be asked for passphrases again | **Forget passphrases** on the LCP tab (iOS only), or `xcrun simctl keychain booted reset` | Clear the app's data (`adb shell pm clear com.example.reactnativereadium`) |
| Also reset licenses (device registration, consumed print/copy rights) | `xcrun simctl keychain booted reset` | Clear the app's data |
| Remove an acquired book | **License** → **Remove** | **License** → **Remove** |

The library only exposes the first row, as `LCP.forgetPassphrases()`; resetting licenses would
give back spent rights, so it is left to these test-only tools.

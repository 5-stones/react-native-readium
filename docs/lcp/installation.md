---
title: Installation
---

# Installing LCP

```sh
yarn add react-native-readium-lcp
```

## Configure liblcp

Tell each platform's build where liblcp is, using the values from EDRLab's integration
instructions. Set them in the environment, or in a `.env` file at your app's root (next to `ios/`
and `android/`) that you keep out of version control:

```sh title=".env"
READIUM_LCP_IOS_PODSPEC=<R2LCPClient podspec URL from EDRLab>
READIUM_LCP_ANDROID_AAR=<path to the liblcp .aar from EDRLab>
```

- Left unset, the app builds without liblcp, and `LCP.initialize()` resolves `false`.
- The environment takes precedence over `.env`, and a blank value counts as unset.
- `.env` supports `KEY=value` lines, with optional `export` and quotes, and no interpolation.
- To switch between EDRLab's test and production libs, change the values and rebuild.

## iOS

Call `readium_lcp_pods` in your Podfile's target, next to `readium_pods`:

```ruby title="ios/Podfile"
target 'MyApp' do
  config = use_native_modules!
  # ...
  readium_pods
  readium_lcp_pods
end
```

Then run `pod install`, and again whenever the URL changes. To set the URL in the Podfile
instead, pass `readium_lcp_pods(podspec: '…')`; it overrides the environment and `.env`.

`Podfile.lock` records the URL as `READIUM_LCP_IOS_PODSPEC_REDACTED`, so it stays private, and
CocoaPods fetches the podspec again on each install. To keep the real URL in the lockfile, pass
`readium_lcp_pods(redact_lockfile: false)`.

Readium downloads EDRLab's certificate revocation list over plain HTTP. Allow that host in
`Info.plist`, or no license will open (`crlFetching`):

```xml title="ios/MyApp/Info.plist"
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

If your app adds `R2LCPClient` some other way than CocoaPods, see
[Custom LCP client](./custom-client.md).

## Android

Apply this package's Gradle script in your app module:

```groovy title="android/app/build.gradle"
apply from: "../../node_modules/react-native-readium-lcp/android/liblcp.gradle"
```

It links the `.aar` at `READIUM_LCP_ANDROID_AAR`. A relative path is resolved against your app's
root. To set it in Gradle instead, use the `readiumLcpAar` property, in `gradle.properties` or
with `-PreadiumLcpAar`; it takes precedence over the environment and `.env`.

### If your app has its own network security config

This package's manifest sets a network security config that allows cleartext HTTP, which LCP
needs. If your app sets its own `android:networkSecurityConfig`, replace this package's:

```xml title="android/app/src/main/AndroidManifest.xml"
<application
  xmlns:tools="http://schemas.android.com/tools"
  android:networkSecurityConfig="@xml/network_security_config"
  tools:replace="android:networkSecurityConfig">
```

and allow cleartext in your config, or no license will open (`crlFetching`):

```xml title="android/app/src/main/res/xml/network_security_config.xml"
<network-security-config>
  <base-config cleartextTrafficPermitted="true" />
</network-security-config>
```

## Next

[Usage](./usage.md): initialize LCP, answer passphrase requests and acquire books.

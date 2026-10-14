---
title: Installation
---

# Installation

```sh
yarn add react-native-readium react-native-nitro-modules
```

The library is built with [Nitro Modules](https://nitro.margelo.com/) and works with both the old
and new React Native architectures.

## iOS

Requirements: iOS 15.1 or later, Xcode 16.4 or later (Swift 6).

The Readium pods are published in Readium's own spec repo. In your `ios/Podfile`:

1. Add Readium's spec repo as a source, ahead of the CocoaPods CDN.
2. Call `readium_pods` in your app's target.
3. Call `readium_post_install` in your `post_install` block.

```ruby title="ios/Podfile"
source 'https://github.com/readium/podspecs'
source 'https://cdn.cocoapods.org/'

platform :ios, '15.1'

target 'MyApp' do
  config = use_native_modules!
  # ...
  readium_pods

  post_install do |installer|
    react_native_post_install(installer, config[:reactNativePath])
    readium_post_install(installer)
  end
end
```

Then install the pods:

```sh
cd ios && pod install
```

## Android

Requirements:

- `compileSdkVersion` 31 or later.
- JDK 17.
- Kotlin 2.3.20 or later. Readium's Kotlin toolkit is compiled against that version; older
  compilers fail with "compiled with an incompatible version of Kotlin".

```groovy title="android/build.gradle"
buildscript {
    ext {
        compileSdkVersion = 36
        kotlinVersion = "2.3.20"
    }
}
```

### Core library desugaring

If the build fails on missing Java 8+ APIs (usually `java.time.*`), enable core library
desugaring in your app module:

```groovy title="android/app/build.gradle"
android {
    compileOptions {
        coreLibraryDesugaringEnabled true
    }
}

dependencies {
    coreLibraryDesugaring "com.android.tools:desugar_jdk_libs:2.1.5"
}
```

With Expo's managed workflow, apply these settings through a config plugin or
`expo-build-properties`, so they survive `prebuild`.

## Web

No native setup. On web, the reader opens a publication over HTTP rather than from a file; see
[Web](../guides/web.md).

## Next steps

- [Quick start](./quick-start.md): render your first book.
- [Readium LCP](/lcp): open DRM-protected books.

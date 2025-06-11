# react-native-readium

[![NPM version](https://img.shields.io/npm/v/react-native-readium.svg?color=success&label=npm%20package&logo=npm)](https://www.npmjs.com/package/react-native-readium)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
![PRs welcome!](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
![This project is released under the MIT license](https://img.shields.io/badge/license-MIT-blue.svg)

----

## Have A Bug/Feature You Care About?

We :heart: open source. We work on the things that are important to us when
we're able to work on them. Have an issue you care about?

- [Dive Into The Code!](CONTRIBUTING.md)
- [Sponsor Your Issue](#sponsor-the-library)

----

## Overview

A react-native wrapper for https://readium.org/. At a high level this package
allows you to do things like:

- Render an ebook view.
- Register for location changes (as the user pages through the book).
- Register for the Table of Contents (so that you can display things like chapters in your app)
- Control settings of the Reader. Things like:
  - Dark Mode, Light Mode, Sepia Mode
  - Font Size
  - Page Margins
  - More (see the `Settings` documentation in the [API section](#api))
- Etc. (read on for more details. :book:)

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Supported Formats & DRM](#supported-formats--drm)
- [API](#api)
- [Contributing](#contributing)
- [Release](#release)
- [License](#license)

| Dark Mode| Light Mode |
|----------|------------|
| ![Dark Mode](https://github.com/5-stones/react-native-readium/blob/main/docs/demo-dark-mode.gif) | ![Light Mode](https://github.com/5-stones/react-native-readium/blob/main/docs/demo-light-mode.gif) |

## Installation

#### Prerequisites

1. **iOS**: Requires an iOS target >= `13.0` (see the iOS section for more details).
2. **Android**: Requires `compileSdkVersion` >= `31` (see the Android section for more details).

:warning: This library does not current support `newArch`. Please disable `newArch` if you intend to use it. PR's welcome.

#### Install Module

**NPM**

```sh
npm install react-native-readium
```

**Yarn**

```sh
yarn add react-native-readium
```

#### iOS

Due to the current state of the `Readium` swift libraries you need to manually
update your `Podfile` ([see more on that here](https://github.com/readium/swift-toolkit/issues/38)).

```rb
# ./ios/Podfile
...
platform :ios, '13.0'

...

target 'ExampleApp' do
  config = use_native_modules!
  ...
  pod 'GCDWebServer', podspec: 'https://raw.githubusercontent.com/readium/GCDWebServer/3.7.5/GCDWebServer.podspec', modular_headers: true
  pod 'ReadiumAdapterGCDWebServer', podspec: 'https://raw.githubusercontent.com/readium/swift-toolkit/2.6.0/Support/CocoaPods/ReadiumAdapterGCDWebServer.podspec', modular_headers: true
  pod 'R2Navigator', podspec: 'https://raw.githubusercontent.com/readium/swift-toolkit/2.6.0/Support/CocoaPods/ReadiumNavigator.podspec'
  pod 'R2Shared', podspec: 'https://raw.githubusercontent.com/readium/swift-toolkit/2.6.0/Support/CocoaPods/ReadiumShared.podspec'
  pod 'R2Streamer', podspec: 'https://raw.githubusercontent.com/readium/swift-toolkit/2.6.0/Support/CocoaPods/ReadiumStreamer.podspec'
  pod 'ReadiumInternal', podspec: 'https://raw.githubusercontent.com/readium/swift-toolkit/2.6.0/Support/CocoaPods/ReadiumInternal.podspec'
  pod 'Minizip', modular_headers: true
  ...
end
```

Finally, install the pods:

`pod install`

#### Android

If you're not using `compileSdkVersion` >= 31 you'll need to update that:

```groovy
// android/build.gradle
...
buildscript {
    ...
    ext {
        ...
        compileSdkVersion = 31
...
```

## Usage

```tsx
import React, { useState } from 'react';
import { ReadiumView } from 'react-native-readium';
import type { File } from 'react-native-readium';

const MyComponent: React.FC = () => {
  const [file] = useState<File>({
    url: SOME_LOCAL_FILE_URL,
  });

  return (
    <ReadiumView
      file={file}
    />
  );
}
```

[Take a look at the Example App](https://github.com/5-stones/react-native-readium/blob/main/example/src/App.tsx) for a more complex usage example.

## Supported Formats & DRM

#### Format Support

| Format | Support | Notes |
|--------|---------|-------|
| Epub 2 | :white_check_mark: | |
| Epub 3 | :white_check_mark: | |
| PDF | :x: | On the roadmap, feel free to submit a PR or ask for direction. |
| CBZ | :x: | On the roadmap, feel free to submit a PR or ask for direction. |

**Missing a format you need?** Reach out and see if it can be added to the roadmap.

#### DRM Support

DRM is not supported at this time. However, there is a clear path to [support it via LCP](https://www.edrlab.org/readium-lcp/) and the intention is to eventually implement it.

## API

#### View Props

| Name | Type | Optional | Description |
|------|------|----------|-------------|
| `file`     | [`File`](https://github.com/5-stones/react-native-readium/blob/main/src/interfaces/File.ts)               | :x:                | A file object containing the path to the eBook file on disk. |
| `location` | [`Locator`](https://github.com/5-stones/react-native-readium/blob/main/src/interfaces/Locator.ts) \| [`Link`](https://github.com/5-stones/react-native-readium/blob/main/src/interfaces/Link.ts)           | :white_check_mark: | A locator prop that allows you to externally control the location of the reader (e.g. Chapters or Bookmarks). <br/><br/>:warning: If you want to set the `location` of an ebook on initial load, you should use the `File.initialLocation` property (look at the `file` prop). See more [here](https://github.com/5-stones/react-native-readium/issues/16#issuecomment-1344128937) |
| `preferences` | [`Partial<Preferences>`](https://github.com/readium/swift-toolkit/blob/main/docs/Guides/Navigator%20Preferences.md#appendix-preference-constraints)  | :white_check_mark: | An object that allows you to control various aspects of the reader's UI (epub only) |
| `style`    | `ViewStyle`          | :white_check_mark: | A traditional style object. |
| `onLocationChange` | `(locator: Locator) => void` | :white_check_mark: | A callback that fires whenever the location is changed (e.g. the user transitions to a new page)|
| `onTableOfContents` | `(toc: Link[] \| null) => void` | :white_check_mark: | A callback that fires once the file is parsed and emits the table of contents embedded in the file. Returns `null` or an empty `[]` if no TOC exists. See the [`Link`](https://github.com/5-stones/react-native-readium/blob/main/src/interfaces/Link.ts) interface for more info. |

#### :warning: Web vs Native File URLs

Please note that on `web` the `File.url` should be a web accessible URL path to
the `manifest.json` of the unpacked epub. In native contexts it needs to be a
local filepath to the epub file itself on disk. If you're not sure how to
serve epub books [take a look at this example](https://github.com/d-i-t-a/R2D2BC/blob/production/examples/server.ts)
which is based on the `dita-streamer-js` project (which is built on all the
readium [r2-*-js](https://github.com/readium?q=js) libraries)

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the
repository and the development workflow.

## Release

The standard release command for this project is:

```
yarn version
```

This command will:

1. Generate/update the Changelog
1. Bump the package version
1. Tag & pushing the commit


e.g.

```
yarn version --new-version 1.2.17
yarn version --patch // 1.2.17 -> 1.2.18
```

## Sponsor The Library

If you'd like to sponsor a specific feature, fix, or the library in general, please reach out on an issue and we'll have a conversation!

## License

MIT

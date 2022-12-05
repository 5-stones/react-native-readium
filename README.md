# react-native-readium

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

## Overview

- [Installation](#installation)
- [Usage](#usage)
- [Supported Formats & DRM](#supported-formats--drm)
- [API](#api)
- [Contributing](#contributing)
- [Release](#release)
- [License](#license)

| Dark Mode| Light Mode |
|---|---|
| ![Dark Mode](https://github.com/5-stones/react-native-readium/blob/main/docs/demo-dark-mode.gif) | ![Light Mode](https://github.com/5-stones/react-native-readium/blob/main/docs/demo-light-mode.gif) |

## Installation

#### Prerequisites

1. **iOS**: Requires an iOS target >= `13.0` (see the iOS section for more details).
2. **Android**: Requires `compileSdkVersion` >= `31` (see the Android section for more details).

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
  pod 'GCDWebServer', podspec: 'https://raw.githubusercontent.com/readium/GCDWebServer/3ec154d358f26858071feaa6429e0f1c16bb11bd/GCDWebServer.podspec', modular_headers: true
  pod 'R2Shared', podspec: 'https://raw.githubusercontent.com/readium/swift-toolkit/2.4.0/Support/CocoaPods/ReadiumShared.podspec'
  pod 'R2Streamer', podspec: 'https://raw.githubusercontent.com/readium/swift-toolkit/2.4.0/Support/CocoaPods/ReadiumStreamer.podspec'
  pod 'R2Navigator', podspec: 'https://raw.githubusercontent.com/readium/swift-toolkit/2.4.0/Support/CocoaPods/ReadiumNavigator.podspec'
  pod 'Minizip', modular_headers: true
  ...
end
```

Finally, install the pods:

`pod install`

#### Android

You might need to [add `jcenter` if you're getting a build failure on android](https://github.com/readium/kotlin-toolkit/issues/31):

```groovy
// android/build.gradle
...

allprojects {
    repositories {
        ...
        // required by react-native-readium https://github.com/readium/kotlin-toolkit/issues/31
        jcenter()
    }
    ...
}
...
```

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
| `location` | [`Locator`](https://github.com/5-stones/react-native-readium/blob/main/src/interfaces/Locator.ts) | [`Link`](https://github.com/5-stones/react-native-readium/blob/main/src/interfaces/Link.ts)           | :white_check_mark: | A locator prop that allows you to externally control the location of the reader (e.g. Chapters or Bookmarks)|
| `settings` | [`Partial<Settings>`](https://github.com/5-stones/react-native-readium/blob/main/src/interfaces/Settings.ts)  | :white_check_mark: | An object that allows you to control various aspects of the reader's UI (epub only) |
| `style`    | `ViewStyle`          | :white_check_mark: | A traditional style object. |
| `onLocationChange` | `(locator: Locator) => void` | :white_check_mark: | A callback that fires whenever the location is changed (e.g. the user transitions to a new page)|
| `onTableOfContents` | `(toc: Link[] \| null) => void` | :white_check_mark: | A callback that fires once the file is parsed and emits the table of contents embedded in the file. Returns `null` or an empty `[]` if no TOC exists. See the [`Link`](https://github.com/5-stones/react-native-readium/blob/main/src/interfaces/Link.ts) interface for more info. |

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

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

## License

MIT

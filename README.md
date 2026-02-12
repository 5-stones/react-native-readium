# react-native-readium

[![NPM version](https://img.shields.io/npm/v/react-native-readium.svg?color=success&label=npm%20package&logo=npm)](https://www.npmjs.com/package/react-native-readium)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
![PRs welcome!](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
![This project is released under the MIT license](https://img.shields.io/badge/license-MIT-blue.svg)

---

## Have A Bug/Feature You Care About?

We :heart: open source. We work on the things that are important to us when
we're able to work on them. Have an issue you care about?

- [Dive Into The Code!](CONTRIBUTING.md)
- [Sponsor Your Issue](#sponsor-the-library)

---

## Overview

A react-native wrapper for https://readium.org/. At a high level this package
allows you to do things like:

- Render an ebook view.
- Register for location changes (as the user pages through the book).
- Access publication metadata including table of contents, positions, and more via the `onPublicationReady` callback
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

| Dark Mode                                                                                        | Light Mode                                                                                         |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| ![Dark Mode](https://github.com/5-stones/react-native-readium/blob/main/docs/demo-dark-mode.gif) | ![Light Mode](https://github.com/5-stones/react-native-readium/blob/main/docs/demo-light-mode.gif) |

## Installation

#### Prerequisites

1. **iOS**: Requires an iOS target >= `13.0` (see the iOS section for more details).
2. **Android**: Requires `compileSdkVersion` >= `31` (see the Android section for more details).

This library uses [Nitro Modules](https://nitro.margelo.com/) and supports both the old and new React Native architectures.

#### Install Module

**NPM**

```sh
npm install react-native-readium react-native-nitro-modules
```

**Yarn**

```sh
yarn add react-native-readium react-native-nitro-modules
```

#### iOS

Requirements:

- Minimum iOS deployment target: iOS 13.4
- Swift compiler: Swift 6.0
- Xcode: Xcode 16.2 (or newer)

The Readium pods live in a custom spec repo, so you need to add the Readium
source to your `Podfile` ([see more on that here](https://github.com/readium/swift-toolkit/issues/38)).

##### Breaking change when upgrading from v4 to v5!

If you are migrating from v4 to v5, please note that you must update your iOS
Podfile to add the Readium spec repo `source` and the `readium_pods` /
`readium_post_install` helpers shown below.

```rb
# ./ios/Podfile
source 'https://github.com/readium/podspecs'
source 'https://cdn.cocoapods.org/'

...

platform :ios, '13.4'

...

target 'ExampleApp' do
  config = use_native_modules!
  ...
  readium_pods
  ...
  post_install do |installer|
    react_native_post_install(installer, ...)
    readium_post_install(installer)
  end
end
```

Finally, install the pods:

`pod install`

#### Android

##### Breaking change when upgrading from v4 to v5!

This release upgrades the Android native implementation to a newer Readium Kotlin Toolkit.
Most apps won’t need code changes, but your **Android build configuration** might.

Requirements:

- **JDK 17** is required to build the Android app (the library targets Java/Kotlin 17).
- **compileSdkVersion** must be >= `31`.

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

##### Core library desugaring (may be required)

If you see build errors related to missing Java 8+ APIs (commonly `java.time.*`), enable
core library desugaring in your app:

```groovy
// android/app/build.gradle
android {
  ...
  compileOptions {
    coreLibraryDesugaringEnabled true
  }
}

dependencies {
  coreLibraryDesugaring "com.android.tools:desugar_jdk_libs:2.1.2"
}
```

##### Expo managed workflow

If your app uses Expo managed workflow (native `android/` is generated via `prebuild` / EAS),
apply the desugaring settings through an Expo config plugin (or `expo-build-properties`) so
they persist across builds.

## Usage

### Basic Example

```tsx
import React, { useState } from 'react';
import { ReadiumView } from 'react-native-readium';
import type { File } from 'react-native-readium';

const MyComponent: React.FC = () => {
  const [file] = useState<File>({
    url: SOME_LOCAL_FILE_URL,
  });

  return <ReadiumView file={file} />;
};
```

### Using Publication Metadata

Access the table of contents, positions, and metadata when the publication is ready:

```tsx
import React, { useState } from 'react';
import { ReadiumView } from 'react-native-readium';
import type { File, PublicationReadyEvent } from 'react-native-readium';

const MyComponent: React.FC = () => {
  const [file] = useState<File>({
    url: SOME_LOCAL_FILE_URL,
  });

  const [toc, setToc] = useState([]);

  const handlePublicationReady = (event: PublicationReadyEvent) => {
    console.log('Title:', event.metadata.title);
    console.log('Author:', event.metadata.author);
    console.log('Table of Contents:', event.tableOfContents);
    console.log('Positions:', event.positions);

    setToc(event.tableOfContents);
  };

  return (
    <ReadiumView file={file} onPublicationReady={handlePublicationReady} />
  );
};
```

### Highlights & Note Taking

![Decorators](https://github.com/5-stones/react-native-readium/blob/main/docs/demo-decorators.gif)

The `selectionActions`, `decorations`, `onSelectionAction`, and `onDecorationActivated` props work together to build highlighting and note-taking features. Here's how the flow works:

1. **Define selection actions** to add custom items to the text selection context menu.
2. **Handle `onSelectionAction`** to capture what the user selected and which action they chose.
3. **Create a `Decoration`** from the selection's locator and add it to your `decorations` state.
4. **Handle `onDecorationActivated`** to let users tap existing highlights to edit or delete them.

```tsx
import React, { useState, useCallback } from 'react';
import { ReadiumView } from 'react-native-readium';
import type {
  File,
  Decoration,
  DecorationGroup,
  SelectionAction,
  SelectionActionEvent,
  DecorationActivatedEvent,
} from 'react-native-readium';

// Register a "Highlight" action in the text selection context menu
const selectionActions: SelectionAction[] = [
  { id: 'highlight', label: 'Highlight' },
];

const MyReader: React.FC<{ file: File }> = ({ file }) => {
  const [decorations, setDecorations] = useState<DecorationGroup[]>([
    { name: 'highlights', decorations: [] },
  ]);

  // User tapped "Highlight" in the selection menu
  const handleSelectionAction = useCallback((event: SelectionActionEvent) => {
    if (event.actionId === 'highlight') {
      const newHighlight: Decoration = {
        id: `highlight-${Date.now()}`,
        locator: event.locator,
        style: {
          type: 'highlight',
          tint: '#FFFF00',
        },
        extras: {
          note: '',
          selectedText: event.selectedText,
        },
      };

      setDecorations((prev) =>
        prev.map((g) =>
          g.name === 'highlights'
            ? { ...g, decorations: [...g.decorations, newHighlight] }
            : g
        )
      );
    }
  }, []);

  // User tapped on an existing highlight
  const handleDecorationActivated = useCallback(
    (event: DecorationActivatedEvent) => {
      const { decoration } = event;
      // Show an edit/delete dialog for this highlight
      console.log('Tapped highlight:', decoration.id);
      console.log('Note:', decoration.extras?.note);
    },
    []
  );

  return (
    <ReadiumView
      file={file}
      decorations={decorations}
      selectionActions={selectionActions}
      onSelectionAction={handleSelectionAction}
      onDecorationActivated={handleDecorationActivated}
    />
  );
};
```

Key concepts:

- **`DecorationGroup`**: A named group of decorations (e.g. `"highlights"`, `"underlines"`). Pass an array of groups to the `decorations` prop.
- **`Decoration`**: A single visual annotation. It references a location in the publication via a `Locator` and defines its appearance via a `DecorationStyle` (supported types: `"highlight"`, `"underline"`).
- **`extras`**: An optional `Record<string, string>` on each `Decoration` where you can store arbitrary metadata like notes, timestamps, or the original selected text.
- **`onSelectionChange`**: Fires as the user adjusts their text selection, useful for showing a live preview or tracking selection state.

[Take a look at the Example App](https://github.com/5-stones/react-native-readium/blob/main/apps/example-native/src/App.tsx) for a full implementation with color picking, note editing, and highlight management.

## Supported Formats & DRM

#### Format Support

| Format | Support            | Notes                                                          |
| ------ | ------------------ | -------------------------------------------------------------- |
| Epub 2 | :white_check_mark: |                                                                |
| Epub 3 | :white_check_mark: |                                                                |
| PDF    | :x:                | On the roadmap, feel free to submit a PR or ask for direction. |
| CBZ    | :x:                | On the roadmap, feel free to submit a PR or ask for direction. |

**Missing a format you need?** Reach out and see if it can be added to the roadmap.

#### DRM Support

DRM is not supported at this time. However, there is a clear path to [support it via LCP](https://www.edrlab.org/readium-lcp/) and the intention is to eventually implement it.

## API

#### View Props

| Name                     | Type                                                                                                                                                                                             | Optional           | Description                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `file`                   | [`File`](https://github.com/5-stones/react-native-readium/blob/main/src/interfaces/File.ts)                                                                                                      | :x:                | A file object containing the path to the eBook file on disk.                                                                                                                                                                                                                                                                                                                       |
| `location`               | [`Locator`](https://github.com/5-stones/react-native-readium/blob/main/src/interfaces/Locator.ts) \| [`Link`](https://github.com/5-stones/react-native-readium/blob/main/src/interfaces/Link.ts) | :white_check_mark: | A locator prop that allows you to externally control the location of the reader (e.g. Chapters or Bookmarks). <br/><br/>:warning: If you want to set the `location` of an ebook on initial load, you should use the `File.initialLocation` property (look at the `file` prop). See more [here](https://github.com/5-stones/react-native-readium/issues/16#issuecomment-1344128937) |
| `preferences`            | [`Partial<Preferences>`](https://github.com/readium/swift-toolkit/blob/main/docs/Guides/Navigator%20Preferences.md#appendix-preference-constraints)                                              | :white_check_mark: | An object that allows you to control various aspects of the reader's UI (epub only)                                                                                                                                                                                                                                                                                                |
| `decorations`            | [`DecorationGroup[]`](https://github.com/5-stones/react-native-readium/blob/main/src/interfaces/Decoration.ts)                                                                                   | :white_check_mark: | An array of decoration groups to render in the publication (e.g. highlights, underlines).                                                                                                                                                                                                                                                                                           |
| `selectionActions`       | [`SelectionAction[]`](https://github.com/5-stones/react-native-readium/blob/main/src/interfaces/SelectionAction.ts)                                                                              | :white_check_mark: | Custom actions to show in the context menu when the user selects text.                                                                                                                                                                                                                                                                                                             |
| `style`                  | `ViewStyle`                                                                                                                                                                                      | :white_check_mark: | A traditional style object.                                                                                                                                                                                                                                                                                                                                                        |
| `onLocationChange`       | `(locator: Locator) => void`                                                                                                                                                                     | :white_check_mark: | A callback that fires whenever the location is changed (e.g. the user transitions to a new page).                                                                                                                                                                                                                                                                                  |
| `onPublicationReady`     | `(event: PublicationReadyEvent) => void`                                                                                                                                                         | :white_check_mark: | A callback that fires once the publication is loaded and provides access to the table of contents, positions, and metadata. See the [`PublicationReadyEvent`](https://github.com/5-stones/react-native-readium/blob/main/src/interfaces/PublicationReady.ts) interface for details.                                                                                                |
| `onDecorationActivated`  | `(event: DecorationActivatedEvent) => void`                                                                                                                                                      | :white_check_mark: | A callback that fires when a user taps on a decoration (e.g. a highlight).                                                                                                                                                                                                                                                                                                         |
| `onSelectionChange`      | `(event: SelectionEvent) => void`                                                                                                                                                                | :white_check_mark: | A callback that fires when the user's text selection changes.                                                                                                                                                                                                                                                                                                                      |
| `onSelectionAction`      | `(event: SelectionActionEvent) => void`                                                                                                                                                          | :white_check_mark: | A callback that fires when the user taps a custom selection action from the context menu.                                                                                                                                                                                                                                                                                          |

#### Ref Methods

The `ReadiumView` component accepts a ref that exposes imperative navigation methods:

```tsx
import React, { useRef } from 'react';
import { ReadiumView } from 'react-native-readium';
import type { ReadiumViewRef } from 'react-native-readium';

const MyComponent: React.FC = () => {
  const ref = useRef<ReadiumViewRef>(null);

  return (
    <>
      <ReadiumView ref={ref} file={file} />
      <Button title="Next" onPress={() => ref.current?.goForward()} />
      <Button title="Previous" onPress={() => ref.current?.goBackward()} />
    </>
  );
};
```

| Method        | Description                                              |
| ------------- | -------------------------------------------------------- |
| `goForward()` | Navigate forward in the publication (e.g. next page).    |
| `goBackward()`| Navigate backward in the publication (e.g. previous page). |

#### :warning: Web vs Native File URLs

Please note that on `web` the `File.url` should be a web accessible URL path to
the `manifest.json` of the unpacked epub. In native contexts it needs to be a
local filepath to the epub file itself on disk. If you're not sure how to
serve epub books [take a look at this example](https://github.com/d-i-t-a/R2D2BC/blob/production/examples/server.ts)
which is based on the `dita-streamer-js` project (which is built on all the
readium [r2-\*-js](https://github.com/readium?q=js) libraries)

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

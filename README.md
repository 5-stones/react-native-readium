# react-native-readium

A react-native wrapper for https://readium.org/

## Installation


#### Install Module
**NPM**

```sh
npm install react-native-readium
```

**Yarn**

```sh
yarn add react-native-readium
```


#### Pod Install

Due to the current state of the `Readium` swift libraries you need to manually
update your `Podfile` ([see more on that here](https://github.com/readium/swift-toolkit/issues/38)).

```rb
# ./ios/Podfile
...

target 'ExampleApp' do
  config = use_native_modules!
  ...
  pod 'GCDWebServer', podspec: 'https://raw.githubusercontent.com/readium/GCDWebServer/a8edee9790ef0995b2cf620ba1a9b5cf146b7221/GCDWebServer.podspec', modular_headers: true
  pod 'R2Shared', podspec: 'https://raw.githubusercontent.com/readium/swift-toolkit/2.2.0/Support/CocoaPods/ReadiumShared.podspec'
  pod 'R2Streamer', podspec: 'https://raw.githubusercontent.com/readium/swift-toolkit/2.2.0/Support/CocoaPods/ReadiumStreamer.podspec'
  pod 'R2Navigator', podspec: 'https://raw.githubusercontent.com/readium/swift-toolkit/2.2.0/Support/CocoaPods/ReadiumNavigator.podspec'
  pod 'ReadiumOPDS', podspec: 'https://raw.githubusercontent.com/readium/swift-toolkit/2.2.0/Support/CocoaPods/ReadiumOPDS.podspec'
  pod 'Minizip', modular_headers: true
  ...
end
```

Finally, install the pods:

`pod install`

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

## API

#### View Props

| Name | Type | Optional | Description |
|------|------|----------|-------------|
| `file`     | [`File`](https://github.com/5-stones/react-native-readium/blob/main/src/interfaces/File.ts)               | :x:                | A file object containing the path to the eBook file on disk. |
| `location` | [`Locator`](https://github.com/5-stones/react-native-readium/blob/main/src/interfaces/Locator.ts)            | :white_check_mark: | A locator prop that allows you to externally control the location of the reader (e.g. Chapters or Bookmarks)|
| `settings` | [`Partial<Settings>`](https://github.com/5-stones/react-native-readium/blob/main/src/interfaces/Settings.ts)  | :white_check_mark: | An object that allows you to control various aspects of the reader's UI (epub only) |
| `style`    | `ViewStyle`          | :white_check_mark: | A traditional style object. |
| `onLocationChange` | `(locator: Locator) => void` | :white_check_mark: | A callback that fires whenever the location is changed (e.g. the user transitions to a new page)|

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

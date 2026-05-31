---
name: react-native-readium
description: Integrate and use the react-native-readium EPUB reader in a React Native or Expo app. Use when installing it (it needs the react-native-nitro-modules peer dep plus iOS Readium CocoaPods sources and Android compileSdk/Kotlin/desugaring config), rendering an EPUB with <ReadiumView>, reading publication metadata/table of contents via onPublicationReady, tracking the reading position with Locators and onLocationChange, setting reader preferences (theme, font size, margins), building highlights/decorations and custom text-selection actions, navigating programmatically (goTo / goForward / goBackward) via a ref, running full-text search, serving web vs native file URLs, or understanding format/DRM/media limitations (EPUB 2/3 only; no PDF, CBZ, DRM, or Media Overlays).
---

# react-native-readium

`react-native-readium` is a React Native wrapper around the [Readium](https://readium.org/)
toolkits (Swift on iOS, Kotlin on Android) for rendering EPUBs. It exposes a single
native component, `<ReadiumView>`, plus a rich imperative ref API. The native bridge is
built with **Nitro Modules** and supports both the old and new RN architectures.

Use this skill whenever a user is adding, configuring, or debugging react-native-readium,
or writing reader features (navigation, preferences, highlights, search) with it.

## Installation

It ships native code, so it is **not** usable in Expo Go — use a development build
(`expo prebuild` / `expo run:ios` / `expo run:android`) or a bare RN app.

```sh
# react-native-nitro-modules is a REQUIRED peer dependency
npm install react-native-readium react-native-nitro-modules
# or: yarn add react-native-readium react-native-nitro-modules
```

**iOS** (min deployment target **15.1**; Xcode 16.2+; Swift 5.10+). The Readium pods come
from a custom spec repo, so the app `ios/Podfile` must add the source and helpers:

```ruby
# ios/Podfile
source 'https://github.com/readium/podspecs'
source 'https://cdn.cocoapods.org/'

platform :ios, '15.1'

target 'YourApp' do
  config = use_native_modules!
  readium_pods                       # adds Readium's Minizip dep with modular headers
  post_install do |installer|
    react_native_post_install(installer, config[:reactNativePath])
    readium_post_install(installer)  # required
  end
end
```
Then `cd ios && pod install`.

**Android**: `compileSdkVersion` ≥ **35**, Kotlin ≥ **2.3.0**, JDK 17, NDK `27.1.12297006`.
If you hit missing `java.time.*` APIs, enable core library desugaring in `android/app/build.gradle`
(`coreLibraryDesugaringEnabled true` + `coreLibraryDesugaring "com.android.tools:desugar_jdk_libs:2.1.2"`).

**Expo**: apply the iOS Podfile changes and Android build settings through a config plugin or
`expo-build-properties` so they survive `prebuild`. For iOS, a `withDangerousMod` plugin that
patches the generated Podfile to add the readium `source` lines + `readium_pods` /
`readium_post_install` is the usual approach (see the repo's `apps/example-native/plugins/with-readium-pods.js`).

## Render an EPUB

`file.url` must point at the publication. **This differs by platform** (common mistake):
- **Native (iOS/Android): a local filesystem path to the EPUB file on disk.** Download or
  copy the `.epub` to app storage first (e.g. with `expo-file-system`), then pass that path.
- **Web: a web-accessible URL to the `manifest.json` of an *unpacked* EPUB** (served via a
  Readium streamer), not the `.epub` file.

```tsx
import React, { useState } from 'react';
import { ReadiumView } from 'react-native-readium';
import type { File } from 'react-native-readium';

export function Reader({ epubPath }: { epubPath: string }) {
  const [file] = useState<File>({ url: epubPath });
  // `preferences` is required by the type; pass {} to use defaults.
  return <ReadiumView file={file} preferences={{}} style={{ flex: 1 }} />;
}
```

Set the initial position with `file.initialLocation` (a `Locator`). Give the view a real
size (`flex: 1` or explicit height) or it renders blank.

## Reading position & metadata

```tsx
import type { PublicationReadyEvent, Locator } from 'react-native-readium';

<ReadiumView
  file={file}
  preferences={{}}
  onPublicationReady={(e: PublicationReadyEvent) => {
    // e.metadata (title, author, …), e.tableOfContents (Link[]), e.positions (Locator[])
  }}
  onLocationChange={(loc: Locator) => {
    // persist `loc` to restore the reader later via file.initialLocation
    // loc.locations?.totalProgression is 0..1 across the whole book
  }}
/>
```

## Preferences (EPUB UI)

Pass a `Partial<Preferences>` to control theme, font size, margins, etc. Common keys:
`theme` (`'light' | 'dark' | 'sepia'`), `fontSize`, `pageMargins`, `scroll`,
`publisherStyles`, `fontFamily`. You can also update them imperatively via
`ref.current?.setPreferences(...)`. See `references/api.md` for the full list and the
[Readium navigator-preferences guide](https://github.com/readium/swift-toolkit/blob/main/docs/Guides/Navigator%20Preferences.md).

## Programmatic navigation (ref)

```tsx
import { useRef } from 'react';
import type { ReadiumViewRef, Locator } from 'react-native-readium';

const ref = useRef<ReadiumViewRef>(null);
// ref.current?.goForward();  ref.current?.goBackward();
// ref.current?.goTo(tocLink as unknown as Locator);  // navigate to a TOC entry / bookmark
<ReadiumView ref={ref} file={file} preferences={{}} />
```

The ref exposes far more than `goTo`/`goForward`/`goBackward` — search, positions, selection,
preferences, and audiobook playback. See `references/api.md`.

## Highlights, decorations & text selection

Highlighting is built from four props working together: `selectionActions` (context-menu
items), `onSelectionAction` (user picked one), `decorations` (the rendered highlights, grouped
by name), and `onDecorationActivated` (user tapped an existing highlight). A `Decoration`
references a `Locator` and a `DecorationStyle` (`'highlight'` or `'underline'`) and can carry
arbitrary string metadata under `extras`. See `references/api.md` for the full flow + example,
and the repo's `apps/example-native` / `apps/common-app` for a complete implementation
(color picker, note editing, persistence).

## Limitations (state these up front)

- **Formats**: EPUB 2 and EPUB 3 only. **No PDF, no CBZ** (on the roadmap).
- **DRM**: not supported (LCP is a possible future path).
- **EPUB Media Overlays (synchronized text+audio read-along) are NOT implemented** — the native
  layer reports `mediaOverlays: false`. For "read along", play a narration track separately
  (e.g. `expo-audio`) alongside the EPUB; it won't be word-synced.
- **Audiobooks**: the ref has `play/pause/seekTo/getMediaState/setPlaybackRate`, which work for
  publications that open as an audiobook (`conforms(to: .audiobook)`), but remote audiobook
  streaming is unreliable. A bare `.mp3` does not open as an audiobook. For robust audio,
  drive playback with a dedicated library (`expo-audio`).

## Common gotchas

- Forgetting the `react-native-nitro-modules` peer dependency → native build/link errors.
- iOS: missing the Readium `source` lines or `readium_pods` / `readium_post_install` in the
  Podfile → pods won't resolve. Deployment target below 15.1 also fails.
- Android: `compileSdkVersion < 35` or Kotlin `< 2.3.0`; or missing desugaring (`java.time.*`).
- Passing a remote `http(s)` `.epub` URL as `file.url` on native — download it locally first.
- Blank reader → the view has no size (add `flex: 1`/height) or `file.url` is wrong for the platform.

## More detail

`references/api.md` — full props table, every ref method, and the key interfaces
(`File`, `Locator`, `Decoration`/`DecorationGroup`, `Preferences`, `PublicationReadyEvent`,
search, and the audio/media types).

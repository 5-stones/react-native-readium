# Plan: Upgrade Readium Native SDKs and Nitro

**Generated**: 2026-05-21
**Estimated Complexity**: High

## Overview

Upgrade `react-native-readium` from Readium Swift `3.5.0` to `3.9.0`, Readium Kotlin `3.1.0` to `3.2.0`, and Nitro/Nitrogen to the latest stable `0.35.7`. The work should preserve the existing React Native API unless native SDK breaking changes require a deliberate public API change.

The safest path is to upgrade Nitro first and regenerate bindings, then upgrade Android Readium, then iOS Readium, with a final cross-platform verification pass using the example native app.

Current local pins:

- Nitro/Nitrogen: `^0.35.0` in `package.json`
- iOS Readium: `~> 3.5.0` in `react-native-readium.podspec`
- Android Readium: `3.1.0` in `android/build.gradle`

Target versions:

- `react-native-nitro-modules`: `0.35.7`
- `nitrogen`: `0.35.7`
- Readium Swift Toolkit: `3.9.0`
- Readium Kotlin Toolkit: `3.2.0`

References:

- Nitro docs: https://nitro.margelo.com/
- Nitro npm: https://www.npmjs.com/package/react-native-nitro-modules
- Readium Swift 3.9.0: https://github.com/readium/swift-toolkit/releases/tag/3.9.0
- Readium Kotlin 3.2.0: https://github.com/readium/kotlin-toolkit/releases/tag/3.2.0

## Prerequisites

- Xcode version compatible with the current React Native and Nitro toolchain.
- Android SDK/NDK installed for the example app.
- CocoaPods access to `https://github.com/readium/podspecs`.
- A representative EPUB fixture set:
  - Simple reflowable EPUB.
  - Fixed-layout EPUB.
  - EPUB with highlights/decorations.
  - EPUB with TOC, positions, metadata, and a saved locator.
  - Optional vertical text / RTL EPUB.
- iOS simulator available. Current known simulator: `iPhone 17 Pro`, UDID `75898999-33BE-4A74-BAA9-C91B004A1FBF`.

## Sprint 1: Baseline and Safety Net

**Goal**: Establish current behavior and create repeatable checks before changing dependency versions.

**Demo/Validation**:

- Existing package builds from clean install.
- Example native app opens a known EPUB on iOS and Android.
- Current failing tests, if any, are documented before upgrade work begins.

### Task 1.1: Record Environment and Dependency Baseline

- **Location**: `package.json`, `yarn.lock`, `android/build.gradle`, `android/gradle.properties`, `react-native-readium.podspec`, `apps/example-native/ios/Podfile.lock`
- **Description**: Record current Node/Yarn, Ruby/CocoaPods, Xcode, Android Gradle Plugin, Gradle, Kotlin, NDK, React Native, Nitro, and Readium versions.
- **Dependencies**: None
- **Acceptance Criteria**:
  - Baseline versions are captured in the implementation notes or PR description.
  - Current lockfile Readium versions are confirmed.
- **Validation**:
  - `yarn install --immutable`
  - `yarn typescript`
  - `yarn lint`

### Task 1.2: Build Current Example App

- **Location**: `apps/example-native`
- **Description**: Build the current example app on iOS and Android before dependency changes.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - iOS build result is known.
  - Android build result is known.
  - Any unrelated pre-existing failure is documented.
- **Validation**:
  - iOS: `cd apps/example-native && yarn ios` or equivalent Xcode build command.
  - Android: `cd apps/example-native && yarn android` or Gradle assemble command.

### Task 1.3: Create Manual EPUB Smoke Checklist

- **Location**: Test notes or PR checklist
- **Description**: Define a manual reader checklist for loading, progress, TOC, navigation, decorations, selection actions, and cleanup/unmount.
- **Dependencies**: Task 1.2
- **Acceptance Criteria**:
  - Checklist includes iOS and Android pass/fail entries.
  - Checklist covers at least one real EPUB fixture.
- **Validation**:
  - Run checklist against the current version once to establish expected behavior.

## Sprint 2: Nitro and Nitrogen Upgrade

**Goal**: Move Nitro tooling to `0.35.7`, regenerate bindings, and make sure generated native glue still compiles before changing Readium.

**Demo/Validation**:

- Generated `nitrogen/` files are refreshed.
- `ReadiumView` host component still mounts.
- TypeScript and native builds pass with the old Readium SDK versions.

### Task 2.1: Pin Nitro Dependencies

- **Location**: `package.json`, `yarn.lock`
- **Description**: Update `nitrogen` and `react-native-nitro-modules` dev dependency ranges to `^0.35.7`; keep `react-native-nitro-modules` as a peer dependency with `*` unless the library wants to enforce a minimum.
- **Dependencies**: Sprint 1
- **Acceptance Criteria**:
  - `package.json` uses latest stable Nitro/Nitrogen.
  - `yarn.lock` resolves both packages to `0.35.7`.
- **Validation**:
  - `yarn install`
  - `yarn why react-native-nitro-modules`
  - `yarn why nitrogen`

### Task 2.2: Regenerate Nitro Bindings

- **Location**: `src/specs/ReadiumView.nitro.ts`, `nitro.json`, `nitrogen/generated`
- **Description**: Run Nitrogen and commit the generated output. Inspect diffs for API-level changes in generated Swift/Kotlin/C++.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - `nitrogen/generated` is fully regenerated.
  - No unexpected spec drift in `ReadiumView.nitro.ts`.
  - Generated config used by `src/components/NitroReadiumView.tsx` is present.
- **Validation**:
  - `yarn nitrogen`
  - `yarn typescript`

### Task 2.3: Fix Nitro Compile Breaks

- **Location**: `ios/HybridReadiumView.swift`, `android/src/main/java/com/reactnativereadium/HybridReadiumView.kt`, `android/CMakeLists.txt`, `react-native-readium.podspec`
- **Description**: Address any generated API, callback, package namespace, or C++ interop changes introduced by Nitro `0.35.7`.
- **Dependencies**: Task 2.2
- **Acceptance Criteria**:
  - Native implementations conform to the regenerated `HybridReadiumViewSpec`.
  - iOS and Android compile with existing Readium versions.
- **Validation**:
  - iOS example build.
  - Android example build.

## Sprint 3: Android Readium Kotlin Upgrade

**Goal**: Upgrade Android Readium Toolkit to `3.2.0` and adapt Kotlin code to API changes.

**Demo/Validation**:

- Android example opens an EPUB.
- Navigation, preferences, decorations, selection actions, and publication-ready events still work.

### Task 3.1: Update Android Readium Version

- **Location**: `android/build.gradle`, `android/gradle.properties`, `apps/example-native/android`
- **Description**: Change `ext.readium_version` from `3.1.0` to `3.2.0`. Review whether Kotlin, AGP, compile SDK, target SDK, or NDK need changes based on Gradle resolution.
- **Dependencies**: Sprint 2
- **Acceptance Criteria**:
  - Gradle resolves `readium-shared`, `readium-streamer`, and `readium-navigator` to `3.2.0`.
  - No duplicate class or dependency conflict from existing AndroidX dependencies.
- **Validation**:
  - `./gradlew :react-native-readium:dependencies` or equivalent dependency insight.
  - Android assemble for debug.

### Task 3.2: Adapt Reader Service and Navigator APIs

- **Location**: `android/src/main/java/com/reactnativereadium/reader/ReaderService.kt`, `android/src/main/java/com/reactnativereadium/reader/EpubReaderFragment.kt`, `android/src/main/java/com/reactnativereadium/reader/BaseReaderFragment.kt`
- **Description**: Fix Kotlin compile errors caused by Readium `3.2.0`, especially around `PublicationOpener`, `DefaultPublicationParser`, `EpubNavigatorFactory`, `EpubNavigatorFragment.Configuration`, and decoration templates.
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - Android code compiles cleanly.
  - Existing behavior remains unchanged unless a Readium API forces a deliberate change.
- **Validation**:
  - `./gradlew assembleDebug`
  - Manual EPUB open on Android.

### Task 3.3: Evaluate New Android EPUB Features

- **Location**: `android/src/main/java/com/reactnativereadium/reader/EpubReaderFragment.kt`
- **Description**: Decide whether to opt into new experimental decoration positioning with `HtmlDecorationTemplates.defaultTemplates(alpha = 1.0, experimentalPositioning = true)`.
- **Dependencies**: Task 3.2
- **Acceptance Criteria**:
  - Decision is documented.
  - If enabled, highlight rendering is visually tested with opaque and translucent highlights.
- **Validation**:
  - Manual decoration smoke test.
  - Screenshot comparison before/after if possible.

### Task 3.4: Verify Android 16 KB Page Size Compatibility

- **Location**: Android build outputs and dependency report
- **Description**: Confirm the app builds and runs with Readium `3.2.0` and inherits the 16 KB page size fixes introduced after `3.1.0`.
- **Dependencies**: Task 3.2
- **Acceptance Criteria**:
  - Build does not fail on native libraries.
  - Release build can be produced.
- **Validation**:
  - `./gradlew assembleRelease`
  - Run on emulator/device where available.

## Sprint 4: iOS Readium Swift Upgrade

**Goal**: Upgrade iOS Readium pods to `3.9.0`, remove deprecated HTTP server usage where practical, and adapt Swift APIs.

**Demo/Validation**:

- iOS example opens an EPUB.
- Navigation, preferences, decorations, selection actions, publication-ready events, and cleanup still work.

### Task 4.1: Update iOS Readium Pod Constraints

- **Location**: `react-native-readium.podspec`, `apps/example-native/ios/Podfile.lock`
- **Description**: Change Readium dependencies from `~> 3.5.0` to `~> 3.9.0` for `ReadiumShared`, `ReadiumStreamer`, and `ReadiumNavigator`. Investigate whether `ReadiumAdapterGCDWebServer` can be removed.
- **Dependencies**: Sprint 2
- **Acceptance Criteria**:
  - Pod install resolves Readium pods to `3.9.0`.
  - Podspec remains valid for consumers.
- **Validation**:
  - `cd apps/example-native/ios && pod install`
  - Inspect `Podfile.lock`.

### Task 4.2: Remove or Isolate GCDWebServer Dependency

- **Location**: `react-native-readium.podspec`, `scripts/readium_pods.rb`, `ios/Reader/EPUB/EPUBHTTPServer.swift`, `ios/Reader/EPUB/EPUBViewController.swift`
- **Description**: Readium Swift `3.8.0+` no longer requires an HTTP server for EPUB. Remove `httpServer: EPUBHTTPServer.shared` if the new initializer allows it. If PDF support still needs the adapter, isolate it and document why.
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - EPUB no longer depends on `ReadiumAdapterGCDWebServer` when possible.
  - Unused `EPUBHTTPServer.swift` is removed or left only if still referenced.
  - `readium_pods` no longer asks app Podfiles to install unnecessary GCDWebServer pods.
- **Validation**:
  - iOS compile.
  - Search for `EPUBHTTPServer`, `ReadiumAdapterGCDWebServer`, `ReadiumGCDWebServer`.

### Task 4.3: Adapt Swift API Changes

- **Location**: `ios/Reader/ReaderService.swift`, `ios/Reader/EPUB/EPUBViewController.swift`, `ios/NitroTypeConverters.swift`, `ios/DecorationData.swift`, `ios/Reader/Common/ReaderViewController.swift`
- **Description**: Fix compile errors from Readium `3.9.0`, especially JSON handling changes, navigator initialization, locator/link/metadata model changes, decoration APIs, and preference APIs.
- **Dependencies**: Task 4.2
- **Acceptance Criteria**:
  - Swift compiles without deprecated APIs except intentionally retained ones.
  - Nitro converter functions still map Readium types to JS-facing types.
- **Validation**:
  - Xcode build.
  - `pod lib lint` if feasible.

### Task 4.4: Verify iOS Reader Behavior

- **Location**: `apps/example-native`
- **Description**: Run the iOS example and execute the manual EPUB smoke checklist.
- **Dependencies**: Task 4.3
- **Acceptance Criteria**:
  - EPUB loads.
  - `onPublicationReady` fires with TOC, positions, and metadata.
  - `onLocationChange` reports stable locators and improved continuous `totalProgression` where available.
  - `goTo`, `goForward`, `goBackward`, decorations, selection, and cleanup work.
- **Validation**:
  - Simulator run on `iPhone 17 Pro` or another booted simulator.
  - Screenshots for loading, navigation, decorations, and selection.

## Sprint 5: Cross-Platform API and Type Compatibility

**Goal**: Ensure the React Native package API remains coherent after native SDK updates.

**Demo/Validation**:

- A consumer can install the package, render `ReadiumView`, receive events, and call imperative methods on both platforms.

### Task 5.1: Audit JS-Facing Types Against New Native Data

- **Location**: `src/specs/ReadiumView.nitro.ts`, `src/interfaces/*`, `ios/NitroTypeConverters.swift`, `android/src/main/java/com/reactnativereadium/utils/NitroTypeConverters.kt`
- **Description**: Compare current JS-facing types with new Readium metadata, locator, accessibility, and decoration fields. Decide whether to expose new fields or preserve the current API.
- **Dependencies**: Sprints 3 and 4
- **Acceptance Criteria**:
  - No native event tries to emit data that Nitro cannot serialize.
  - Any new public field has a matching type, converter, docs, and example usage.
- **Validation**:
  - `yarn typescript`
  - Manual event logging from example app.

### Task 5.2: Update Public Docs

- **Location**: `README.md`, `docs/*`, `CHANGELOG.md` if maintained manually
- **Description**: Update install notes, minimum iOS/Android requirements, Nitro dependency version, Readium version notes, and any `readium_pods` instructions if iOS helper requirements changed.
- **Dependencies**: Task 5.1
- **Acceptance Criteria**:
  - README accurately reflects required `react-native-nitro-modules` install.
  - iOS instructions reflect Readium `3.9.0` and whether `readium_pods` is still needed.
  - Android instructions reflect Readium `3.2.0` and build requirements.
- **Validation**:
  - Documentation review against actual install/build steps.

### Task 5.3: Update Example App Locks

- **Location**: `apps/example-native/package.json`, `apps/example-native/ios/Podfile.lock`, Android Gradle lock/dependency outputs if present
- **Description**: Refresh lockfiles after Nitro and Readium updates.
- **Dependencies**: Sprints 3 and 4
- **Acceptance Criteria**:
  - Lockfiles reflect target versions.
  - No stale `3.5.0` iOS Readium or `3.1.0` Android Readium references remain unless documented.
- **Validation**:
  - `rg "3\\.5\\.0|3\\.1\\.0|0\\.35\\.0" package.json yarn.lock apps/example-native/ios/Podfile.lock android react-native-readium.podspec`

## Sprint 6: Verification, Release Readiness, and Rollback

**Goal**: Prove the upgraded package is releasable and document rollback steps.

**Demo/Validation**:

- CI-style local checks pass.
- iOS and Android example app can open and interact with EPUBs.
- Release notes and migration notes are ready.

### Task 6.1: Full Local Quality Gate

- **Location**: Entire repository
- **Description**: Run package-level static checks and builds.
- **Dependencies**: Sprints 2 through 5
- **Acceptance Criteria**:
  - TypeScript passes.
  - Lint passes or known unrelated failures are documented.
  - iOS and Android example builds pass.
- **Validation**:
  - `yarn typescript`
  - `yarn lint`
  - iOS build
  - Android debug and release build

### Task 6.2: Manual Reader Regression Pass

- **Location**: `apps/example-native`
- **Description**: Run the smoke checklist on both platforms using representative EPUBs.
- **Dependencies**: Task 6.1
- **Acceptance Criteria**:
  - Reflowable EPUB works.
  - Fixed-layout EPUB works.
  - TOC, positions, metadata, progress, navigation, decorations, selection actions, and unmount cleanup work.
  - Any behavior differences are documented.
- **Validation**:
  - Simulator/emulator screenshots.
  - Event logs from example app.

### Task 6.3: Prepare Release Notes

- **Location**: `CHANGELOG.md`, PR description, release notes
- **Description**: Document upgraded dependencies, minimum platform/tooling requirements, known breaking changes, and migration guidance for consumers.
- **Dependencies**: Task 6.2
- **Acceptance Criteria**:
  - Notes call out Readium Swift `3.9.0`, Readium Kotlin `3.2.0`, Nitro `0.35.7`.
  - Notes call out any iOS Podfile changes.
  - Notes call out any Android Gradle/Kotlin/SDK changes.
- **Validation**:
  - Review against actual diff and build requirements.

## Testing Strategy

- **Static checks**:
  - `yarn typescript`
  - `yarn lint`
  - `yarn test` if current tests exist and are meaningful.
- **Nitro generation checks**:
  - `yarn nitrogen`
  - Confirm generated files are committed and no generated config is missing.
- **iOS checks**:
  - `pod install` in `apps/example-native/ios`.
  - Xcode/simulator build.
  - Manual EPUB smoke checklist.
- **Android checks**:
  - Gradle dependency resolution.
  - Debug build.
  - Release build.
  - Manual EPUB smoke checklist.
- **Runtime checks**:
  - Open EPUB.
  - Change preferences.
  - Apply and activate decorations.
  - Select text and trigger custom action.
  - Navigate by locator and buttons.
  - Unmount/remount `ReadiumView`.

## Potential Risks and Gotchas

- Readium minor releases may contain small breaking changes. Treat compile errors as expected work, not a surprise.
- iOS `3.9.0` moves public JSON parsing/serialization APIs toward `JSONValue`; converter code may need real changes.
- iOS `ReadiumAdapterGCDWebServer` is deprecated. Removing it is good, but only after confirming no remaining code path needs it.
- Android `3.2.0` updates Kotlin/Gradle-related internals upstream. The package may need Kotlin, AGP, or NDK alignment to build in consuming apps.
- Nitro generated files can change even when the TypeScript spec does not. Review generated diffs carefully before mixing them with Readium changes.
- The public JS API may hide new Readium fields. That is acceptable for a dependency upgrade, but should be documented if users expect new metadata.
- Example app lockfiles may mask consumer install issues. Test both the workspace example and a clean consumer-style install if time allows.
- Removing iOS helper pods could be a breaking install change for users relying on `readium_pods`; make that change only with clear docs.

## Rollback Plan

- Revert Nitro changes:
  - Restore `nitrogen` and `react-native-nitro-modules` ranges in `package.json`.
  - Restore `yarn.lock`.
  - Restore prior `nitrogen/generated` output.
- Revert Android Readium:
  - Set `ext.readium_version` back to `3.1.0`.
  - Restore any Kotlin API compatibility changes that only supported `3.2.0`.
- Revert iOS Readium:
  - Set podspec constraints back to `~> 3.5.0`.
  - Restore `ReadiumAdapterGCDWebServer`, `EPUBHTTPServer.swift`, and `httpServer:` usage if removed.
  - Regenerate `apps/example-native/ios/Podfile.lock`.
- If only one platform fails late:
  - Keep the successful platform upgrade on a branch.
  - Split PRs into Nitro, Android Readium, and iOS Readium upgrades.

## Open Decisions Before Implementation

- Should Android enable Readium `3.2.0` experimental decoration positioning by default, or leave highlight rendering behavior unchanged?
- Should iOS remove `ReadiumAdapterGCDWebServer` in the same upgrade PR, or keep it for a smaller first upgrade and remove it later?
- Should the library expose new Readium metadata/locator fields in the JS API now, or keep the public API stable and defer enhancements?

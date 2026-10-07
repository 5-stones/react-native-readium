---
title: Content protection
---

# Registering a content protection

`react-native-readium` ships no DRM itself. Its native `PublicationOpener` accepts Readium's
`ContentProtection` interface, and your native code can register protections with it.
[`react-native-readium-lcp`](/lcp) uses this for LCP; other DRM schemes can use it
directly.

The registry starts empty, so unprotected publications open as before. It's read each time a
publication opens, so register a protection before setting the reader's `file`; registering after
a `ReadiumView` mounts is fine. A protected publication with no matching protection fails to open
with `protectionNotSupported`.

## iOS

```swift
import ReadiumShared
import NitroReadium

ReaderContentProtectionRegistry.register(myContentProtection)
```

From Objective-C, or from a Swift module that can't import the library because its Nitro headers
are C++, declare the Objective-C entry point in a bridging header:

```objc
@interface RNRContentProtectionRegistry : NSObject
+ (BOOL)registerProtection:(id)protection;
+ (void)unregisterProtection:(id)protection;
@end
```

```swift
RNRContentProtectionRegistry.registerProtection(myContentProtection)
```

`id` imports into Swift as `Any`, so pure-Swift protections pass straight through. It returns
`false` if the object isn't a `ContentProtection`. Keep the same instance to unregister it later,
since entries are matched by identity.

## Android

```kotlin
import com.reactnativereadium.reader.ReaderContentProtectionRegistry

ReaderContentProtectionRegistry.register(myContentProtection)
```

## Behavior

- A protected publication that opens reports `isProtected: true` and its `protectionScheme` in
  `onPublicationReady`.
- One that can't be unlocked reports `protectionNotSupported`, `restricted` or `cancelled` through
  [`onPublicationError`](../guides/errors.md).
- `file.credentials` is handed to the protections when the publication opens.
- Prompts, such as a passphrase request, should be answered from JS through your protection's own
  API, not Readium's native dialogs. On Android, `LcpDialogAuthentication` waits for
  `onParentViewAttachedToWindow(view)`, and the open stalls until it's called.
- Both platforms have a matching `unregister`, for modules torn down with the JS runtime while the
  process lives on. Registering a second protection of the same type replaces the first.

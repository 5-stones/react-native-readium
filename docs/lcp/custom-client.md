---
title: Custom LCP client
---

# Custom LCP client (iOS)

When `readium_lcp_pods` links liblcp, this package adapts and registers it for you. Register your
own client instead when:

- your app adds `R2LCPClient` some other way (Swift Package Manager, Carthage, or a framework
  added in Xcode), since this package's pod can't see it then; or
- you want a different `LCPClient`, such as a test client.

A registered client always takes precedence over the one `readium_lcp_pods` links.

## 1. Declare the registry

This package's Swift module can't be imported from an app (its Nitro headers are C++), so declare
its registry in your bridging header:

```objc title="MyApp-Bridging-Header.h"
#import <Foundation/Foundation.h>

@interface RNRLCPClientRegistry : NSObject
+ (BOOL)registerClient:(id)client;
@end
```

## 2. Adapt `R2LCPClient`

```swift
import R2LCPClient
import ReadiumLCP

final class LiblcpClient: ReadiumLCP.LCPClient {
  func createContext(jsonLicense: String, hashedPassphrase: LCPPassphraseHash, pemCrl: String) throws -> LCPClientContext {
    try R2LCPClient.createContext(jsonLicense: jsonLicense, hashedPassphrase: hashedPassphrase, pemCrl: pemCrl)
  }

  func decrypt(data: Data, using context: LCPClientContext) -> Data? {
    R2LCPClient.decrypt(data: data, using: context as! DRMContext)
  }

  func findOneValidPassphrase(jsonLicense: String, hashedPassphrases: [LCPPassphraseHash]) -> LCPPassphraseHash? {
    R2LCPClient.findOneValidPassphrase(jsonLicense: jsonLicense, hashedPassphrases: hashedPassphrases)
  }
}
```

## 3. Register it at launch

In `application(_:didFinishLaunchingWithOptions:)`, before JS calls `LCP.initialize()`:

```swift
RNRLCPClientRegistry.registerClient(LiblcpClient())
```

`registerClient` returns `false` if the object isn't a `ReadiumLCP.LCPClient`.

On Android, Readium loads liblcp from the classpath, so there's nothing to register.

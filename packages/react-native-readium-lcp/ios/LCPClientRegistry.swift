import Foundation
import ReadiumLCP

/// Where the host app hands over its `LCPClient`: the adapter around EDRLab's proprietary
/// `R2LCPClient`, which only the app can link. `HybridReadiumLCP.initialize` reads it.
///
/// Exposed to Objective-C because a host's Swift code may be unable to `import NitroReadiumLCP`,
/// whose Nitro headers are C++. Declare it in the app's bridging header:
///
/// ```objc
/// @interface RNRLCPClientRegistry : NSObject
/// + (BOOL)registerClient:(id)client;
/// @end
/// ```
@objc(RNRLCPClientRegistry)
public final class LCPClientRegistry: NSObject {
  private static let lock = NSLock()
  private static var storage: LCPClient?

  static var client: LCPClient? {
    lock.lock()
    defer { lock.unlock() }
    return storage
  }

  /// Returns false when `client` doesn't conform to `ReadiumLCP.LCPClient`.
  @objc
  public static func registerClient(_ client: AnyObject) -> Bool {
    guard let client = client as? LCPClient else { return false }
    lock.lock()
    defer { lock.unlock() }
    storage = client
    return true
  }
}

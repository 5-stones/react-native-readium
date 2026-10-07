import Foundation
import ReadiumLCP

/// Where `HybridReadiumLCP.initialize` gets its `LCPClient`: EDRLab's liblcp, adapted by
/// `LiblcpClient` when the app links it with `readium_lcp_pods`, or a client the app registers,
/// which takes precedence (a test client, or its own adapter).
///
/// Exposed to Objective-C because a host's Swift code may be unable to `import NitroReadiumLCP`,
/// whose Nitro headers are C++. To register a client, declare it in the app's bridging header:
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
    return storage ?? linkedClient
  }

#if canImport(R2LCPClient)
  private static let linkedClient: LCPClient? = LiblcpClient()
#else
  private static let linkedClient: LCPClient? = nil
#endif

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

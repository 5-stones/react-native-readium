import Foundation
import ReadiumShared

/// Content protections supplied by the host app, read once when `ReaderService` builds its
/// `PublicationOpener`. Empty by default, so unprotected publications open unchanged.
public enum ReaderContentProtectionRegistry {
  // Hosts may register off the main thread (e.g. at module init) while a `ReaderService` reads.
  private static let lock = NSLock()
  private static var storage: [ContentProtection] = []

  public static var protections: [ContentProtection] {
    lock.lock()
    defer { lock.unlock() }
    return storage
  }

  // Replace by type: a JS reload would otherwise leave a stale protection first in line.
  public static func register(_ protection: ContentProtection) {
    lock.lock()
    defer { lock.unlock() }
    storage.removeAll { type(of: $0) == type(of: protection) }
    storage.append(protection)
  }

  // Reference equality, so a protection is assumed to be a class, as all of Readium's own are.
  public static func unregister(_ protection: ContentProtection) {
    lock.lock()
    defer { lock.unlock() }
    storage.removeAll { ($0 as AnyObject) === (protection as AnyObject) }
  }
}

/// Objective-C entry point for host modules that cannot `import NitroReadium`, whose Nitro
/// headers are C++-only. Takes `AnyObject` (`id`) rather than `NSObject`, since Readium's own
/// protections, such as the one `LCPService.contentProtection(with:)` returns, are pure Swift
/// classes; `ContentProtection` itself has no ObjC representation, so the cast happens here.
@objc(RNRContentProtectionRegistry)
public final class ReaderContentProtectionRegistryObjC: NSObject {
  @objc
  public static func registerProtection(_ protection: AnyObject) -> Bool {
    guard let protection = protection as? ContentProtection else { return false }
    ReaderContentProtectionRegistry.register(protection)
    return true
  }

  @objc
  public static func unregisterProtection(_ protection: AnyObject) {
    guard let protection = protection as? ContentProtection else { return }
    ReaderContentProtectionRegistry.unregister(protection)
  }
}

import ReadiumShared

/// Content protections supplied by the host app, read once when `ReaderService` builds its
/// `PublicationOpener`. Empty by default, so unprotected publications open unchanged.
public enum ReaderContentProtectionRegistry {
  public private(set) static var protections: [ContentProtection] = []

  // Replace by type: a JS reload would otherwise leave a stale protection first in line.
  public static func register(_ protection: ContentProtection) {
    protections.removeAll { type(of: $0) == type(of: protection) }
    protections.append(protection)
  }

  // Reference equality, so a protection is assumed to be a class, as all of Readium's own are.
  public static func unregister(_ protection: ContentProtection) {
    protections.removeAll { ($0 as AnyObject) === (protection as AnyObject) }
  }
}

/// Objective-C entry point for host modules that cannot `import NitroReadium`, whose Nitro
/// headers are C++-only. Takes `NSObject` since `ContentProtection` has no ObjC representation.
@objc(RNRContentProtectionRegistry)
public final class ReaderContentProtectionRegistryObjC: NSObject {
  @objc
  public static func registerProtection(_ protection: NSObject) -> Bool {
    guard let protection = protection as? ContentProtection else { return false }
    ReaderContentProtectionRegistry.register(protection)
    return true
  }

  @objc
  public static func unregisterProtection(_ protection: NSObject) {
    guard let protection = protection as? ContentProtection else { return }
    ReaderContentProtectionRegistry.unregister(protection)
  }
}

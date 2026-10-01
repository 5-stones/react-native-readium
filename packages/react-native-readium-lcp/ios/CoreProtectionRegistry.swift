import Foundation
import ObjectiveC
import ReadiumShared

/// Registers with react-native-readium's content protection registry through its Objective-C
/// entry point, looked up at runtime: its Swift module can't be imported here because its
/// Nitro headers are C++.
enum CoreProtectionRegistry {
  private static let className = "RNRContentProtectionRegistry"
  private static let selector = NSSelectorFromString("registerProtection:")

  /// False when react-native-readium isn't linked or rejected the protection.
  static func register(_ protection: ContentProtection) -> Bool {
    guard
      let cls = NSClassFromString(className),
      let method = class_getClassMethod(cls, selector)
    else {
      return false
    }

    typealias RegisterProtection = @convention(c) (AnyClass, Selector, AnyObject) -> Bool
    let register = unsafeBitCast(method_getImplementation(method), to: RegisterProtection.self)
    return register(cls, selector, protection as AnyObject)
  }
}

import Foundation
import ReadiumLCP

/// Rejects a JS promise with `[code] {json}`, which the TS wrapper turns into an `LcpError`.
/// The JSON carries `detail` (the native description, for logs) and any `fields`, such as dates
/// in milliseconds; the wrapper writes the user-facing message from the code and those fields.
///
/// Nitro rejects with `String(describing: error)`, not `localizedDescription`, so the format is
/// produced by `description`.
struct LCPBridgeError: Error, CustomStringConvertible {
  let code: LcpErrorCode
  let message: String
  var fields: [String: Double] = [:]

  var description: String {
    var payload: [String: Any] = fields
    payload["detail"] = message
    let json = (try? JSONSerialization.data(withJSONObject: payload))
      .flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
    return "[\(code.stringValue)] \(json)"
  }

  static let notInitialized = LCPBridgeError(
    code: .notinitialized,
    message: "Call LCP.initialize() before using the LCP service."
  )
}

extension LCPError {
  var bridged: LCPBridgeError {
    LCPBridgeError(code: code, message: String(describing: self), fields: fields)
  }

  /// The `LcpErrorCode` JS sees for this error.
  var code: LcpErrorCode {
    switch self {
    case .missingPassphrase: return .missingpassphrase
    case .notALicenseDocument: return .notalicensedocument
    case .licenseIsBusy: return .licenseisbusy
    case .licenseIntegrity: return .licenseintegrity
    case .licenseStatus(let status):
      switch status {
      case .cancelled: return .licensecancelled
      case .returned: return .licensereturned
      // Swift reports a loan that hasn't started yet as expired too.
      case .expired(let start, _): return start > Date() ? .licensenotstarted : .licenseexpired
      case .revoked: return .licenserevoked
      }
    case .licenseContainer: return .licensecontainer
    case .licenseInteractionNotAvailable: return .licenseinteractionnotavailable
    case .licenseProfileNotSupported: return .licenseprofilenotsupported
    case .licenseRenew(let error):
      if case .invalidRenewalPeriod = error { return .invalidrenewalperiod }
      return .renewfailed
    case .licenseReturn(let error):
      if case .alreadyReturnedOrExpired = error { return .alreadyreturnedorexpired }
      return .returnfailed
    case .crlFetching: return .crlfetching
    case .parsing: return .parsing
    case .network: return .network
    case .runtime, .unknown: return .unknown
    }
  }

  /// The dates and counts a message about this error should mention.
  private var fields: [String: Double] {
    let millis: (Date) -> Double = { $0.timeIntervalSince1970 * 1000 }
    switch self {
    case .licenseStatus(let status):
      switch status {
      case .cancelled(let date), .returned(let date):
        return ["date": millis(date)]
      case .expired(let start, let end):
        return start > Date() ? ["date": millis(start)] : ["date": millis(end)]
      case .revoked(let date, let devicesCount):
        return ["date": millis(date), "devicesCount": Double(devicesCount)]
      }
    case .licenseRenew(.invalidRenewalPeriod(let maxRenewDate)):
      return maxRenewDate.map { ["maxRenewDate": millis($0)] } ?? [:]
    default:
      return [:]
    }
  }
}

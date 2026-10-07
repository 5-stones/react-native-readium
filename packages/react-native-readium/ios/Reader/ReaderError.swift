import Foundation
import ReadiumShared

enum ReaderError: LocalizedError {
  case formatNotSupported
  case epubNotValid
  case openFailed(Error)
  case fileNotFound(Error)
  case cancelled
  case restricted(scheme: ContentProtectionScheme?, error: Error)

  /// The platform's own description, which JS reports as the error's `detail`; its `message`
  /// comes from `code`, the same on every platform.
  var errorDescription: String? {
    switch self {
    case .formatNotSupported:
      return "Format not supported"
    case .epubNotValid:
      return "Invalid EPUB"
    case .openFailed(let error):
      return "Failed to open the publication: \(Self.describe(error))"
    case .fileNotFound(let error):
      return Self.describe(error)
    case .cancelled:
      return "Access to the publication was not granted."
    case .restricted(_, let error):
      return Self.describe(error)
    }
  }

  /// Readium's errors, such as LCPError, are rarely `LocalizedError` and would read "error 14".
  private static func describe(_ error: Error) -> String {
    (error as? LocalizedError)?.errorDescription ?? String(describing: error)
  }

  /// The `code` reported to JS in `PublicationErrorEvent`.
  var code: PublicationErrorCode {
    switch self {
    case .formatNotSupported:
      return .formatnotsupported
    case .epubNotValid, .openFailed:
      return .openfailed
    case .fileNotFound:
      return .filenotfound
    case .cancelled:
      return .cancelled
    case .restricted(_, let error):
      return error is ContentProtectionSchemeNotSupportedError ? .protectionnotsupported : .restricted
    }
  }

  var protectionScheme: String? {
    guard case .restricted(let scheme, _) = self else { return nil }
    return scheme?.rawValue.string
  }

}

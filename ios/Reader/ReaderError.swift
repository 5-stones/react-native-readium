import Foundation
import ReadiumShared

enum ReaderError: LocalizedError {
  case formatNotSupported
  case epubNotValid
  case openFailed(Error)
  case fileNotFound(Error)
  case cancelled
  case restricted(scheme: ContentProtectionScheme?, error: Error)

  var errorDescription: String? {
    switch self {
    case .formatNotSupported:
      return NSLocalizedString("reader_error_formatNotSupported", comment: "Error message when trying to read a publication with a unsupported format")
    case .epubNotValid:
      return NSLocalizedString("reader_error_epubNotValid", comment: "Error message when trying to read an EPUB that is invalid")
    case .openFailed(let error):
      return String(format: NSLocalizedString("reader_error_openFailed", comment: "Error message used when a low-level error occured while opening a publication"), error.localizedDescription)
    case .fileNotFound(let error):
      return String(format: NSLocalizedString("reader_error_openFailed", comment: "Error message used when a low-level error occured while attempting to open the specified file"), error.localizedDescription)
    case .restricted(_, let error):
      return error.localizedDescription
    default:
      return nil
    }
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

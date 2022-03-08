import Foundation

enum ReaderError: LocalizedError {
  case formatNotSupported
  case epubNotValid
  case openFailed(Error)
  case fileNotFound(Error)
  case cancelled

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
    default:
      return nil
    }
  }

}

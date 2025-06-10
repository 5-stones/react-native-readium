import Foundation
import UIKit
import R2Shared


/// The ReaderModule handles the presentation of publications to be read by the user.
/// It contains sub-modules implementing ReaderFormatModule to handle each format of publication (eg. CBZ, EPUB).
protocol ReaderModuleAPI {
  var delegate: ReaderModuleDelegate? { get }

  func getViewController(
    for publication: Publication,
    bookId: String,
    locator: Locator?
  ) -> ReaderViewController?
}

protocol ReaderModuleDelegate: ModuleDelegate {}


final class ReaderModule: ReaderModuleAPI {
  weak var delegate: ReaderModuleDelegate?

  /// Sub-modules to handle different publication formats (eg. EPUB, CBZ)
  var formatModules: [ReaderFormatModule] = []

  init(
    delegate: ReaderModuleDelegate?
  ) {
    self.delegate = delegate

    formatModules = [
      // CBZModule(delegate: self),
      EPUBModule(delegate: self),
    ]

    // TODO: add PDF reader later
    // if #available(iOS 11.0, *) {
    //   formatModules.append(PDFModule(delegate: self))
    // }
  }

  func getViewController(
    for publication: Publication,
    bookId: String,
    locator: Locator?
  ) -> ReaderViewController? {
    guard let module = self.formatModules.first(
      where:{ $0.supports(publication) }
    ) else {
      print("Unable to display the publication due to an unsupported format.")
      return nil
    }

    do {
      return try module.makeReaderViewController(
        for: publication,
        locator: locator,
        bookId: bookId
      )
    } catch {
      print("An unexpected error occurred when attempting to build the reader view.")
      print(error)
      return nil
    }
  }

}


extension ReaderModule: ReaderFormatModuleDelegate {
  func presentAlert(_ title: String, message: String, from viewController: UIViewController) {
    delegate?.presentAlert(title, message: message, from: viewController)
  }

  func presentError(_ error: Error?, from viewController: UIViewController) {
    delegate?.presentError(error, from: viewController)
  }

}

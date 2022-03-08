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
  private let resourcesServer: ResourcesServer

  /// Sub-modules to handle different publication formats (eg. EPUB, CBZ)
  var formatModules: [ReaderFormatModule] = []

  init(
    delegate: ReaderModuleDelegate?,
    resourcesServer: ResourcesServer
  ) {
    self.delegate = delegate
    self.resourcesServer = resourcesServer

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
      where:{ $0.publicationFormats.contains(publication.format) }
    ) else {
      // delegate.presentError(ReaderError.formatNotSupported, from: rootViewController)
      // completion()
      print(">>>>>>>> woof 1")
      return nil
    }

    do {
      return try module.makeReaderViewController(
        for: publication,
        locator: locator,
        bookId: bookId,
        resourcesServer: resourcesServer
      )
    } catch {
      print(">>>>>>>> woof 2")
      print(error)
      return nil
      // delegate.presentError(error, from: rootViewController)
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

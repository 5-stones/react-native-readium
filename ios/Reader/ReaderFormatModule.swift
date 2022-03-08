import Foundation
import UIKit
import R2Shared


/// A ReaderFormatModule is a sub-module of ReaderModule that handles publication of a given format (eg. EPUB, CBZ).
protocol ReaderFormatModule {

  var delegate: ReaderFormatModuleDelegate? { get }

  /// Publication types handled by this sub-module.
  var publicationFormats: [Publication.Format] { get }

  /// Creates the view controller to present the publication.
  func makeReaderViewController(
    for publication: Publication,
    locator: Locator?,
    bookId: String,
    resourcesServer: ResourcesServer
  ) throws -> ReaderViewController

}

protocol ReaderFormatModuleDelegate: AnyObject {
  func presentAlert(_ title: String, message: String, from viewController: UIViewController)
  func presentError(_ error: Error?, from viewController: UIViewController)
}

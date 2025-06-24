import Foundation
import UIKit
import R2Shared


/// A ReaderFormatModule is a sub-module of ReaderModule that handles publication of a given format (eg. EPUB, CBZ).
protocol ReaderFormatModule {

  var delegate: ReaderFormatModuleDelegate? { get }

  /// Returns whether the given publication is supported by this module.
  func supports(_ publication: Publication) -> Bool

  /// Creates the view controller to present the publication.
  func makeReaderViewController(
    for publication: Publication,
    locator: Locator?,
    bookId: String
  ) throws -> ReaderViewController

}

protocol ReaderFormatModuleDelegate: AnyObject {
  func presentAlert(_ title: String, message: String, from viewController: UIViewController)
  func presentError(_ error: Error?, from viewController: UIViewController)
}

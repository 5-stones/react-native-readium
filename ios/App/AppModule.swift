import Combine
import Foundation
import UIKit
import R2Shared
import R2Streamer


/// Base module delegate, that sub-modules' delegate can extend.
/// Provides basic shared functionalities.
protocol ModuleDelegate: AnyObject {
  func presentAlert(_ title: String, message: String, from viewController: UIViewController)
  func presentError(_ error: Error?, from viewController: UIViewController)
}


/// Main application module, it:
/// - owns the sub-modules (reader, etc.)
/// - orchestrates the communication between its sub-modules, through the modules' delegates.
final class AppModule {

  // App modules
  var reader: ReaderModuleAPI! = nil

  init() throws {
    guard let server = PublicationServer() else {
      /// FIXME: we should recover properly if the publication server can't start, maybe this should only forbid opening a publication?
      fatalError("Can't start publication server")
    }

    reader = ReaderModule(delegate: self)

    // Set Readium 2's logging minimum level.
    R2EnableLog(withMinimumSeverityLevel: .debug)
  }
}


extension AppModule: ModuleDelegate {

  func presentAlert(_ title: String, message: String, from viewController: UIViewController) {
    let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
    let dismissButton = UIAlertAction(title: NSLocalizedString("ok_button", comment: "Alert button"), style: .cancel)
    alert.addAction(dismissButton)
    viewController.present(alert, animated: true)
  }

  func presentError(_ error: Error?, from viewController: UIViewController) {
    guard let error = error else { return }
    if case ReaderError.cancelled = error { return }
    presentAlert(
      NSLocalizedString("error_title", comment: "Alert title for errors"),
      message: error.localizedDescription,
      from: viewController
    )
  }

}


extension AppModule: ReaderModuleDelegate {}

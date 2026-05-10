import UIKit
import ReadiumShared
import ReadiumNavigator

final class CBZViewController: ReaderViewController {

    init(
        publication: Publication,
        locator: ReadiumShared.Locator?,
        bookId: String
    ) throws {
        let navigator = try CBZNavigatorViewController(
            publication: publication,
            initialLocation: locator,
            httpServer: EPUBHTTPServer.shared
        )
        super.init(
            navigator: navigator,
            publication: publication,
            bookId: bookId
        )
        navigator.delegate = self
    }
}

extension CBZViewController: CBZNavigatorDelegate {}

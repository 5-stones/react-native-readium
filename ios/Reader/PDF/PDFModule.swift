import Foundation
import UIKit
import ReadiumShared
import ReadiumNavigator

final class PDFModule: ReaderFormatModule {

    weak var delegate: ReaderFormatModuleDelegate?

    init(delegate: ReaderFormatModuleDelegate?) {
        self.delegate = delegate
    }

    func supports(_ publication: Publication) -> Bool {
        publication.conforms(to: .pdf)
    }

    func makeReaderViewController(
        for publication: Publication,
        locator: ReadiumShared.Locator?,
        bookId: String,
        selectionActions: [SelectionActionData]?
    ) throws -> ReaderViewController {
        var preferences = PDFPreferences()
        preferences.scroll = true
        preferences.scrollAxis = .vertical

        var config = PDFNavigatorViewController.Configuration()
        config.preferences = preferences

        let navigator = try PDFNavigatorViewController(
            publication: publication,
            initialLocation: locator,
            config: config,
            httpServer: HTTPServer.shared
        )

        let controller = try PDFViewController(
            publication: publication,
            locator: locator,
            bookId: bookId,
            navigator: navigator
        )

        controller.moduleDelegate = delegate
        return controller
    }
}

import Foundation
import UIKit
import ReadiumShared

final class CBZModule: ReaderFormatModule {

    weak var delegate: ReaderFormatModuleDelegate?

    init(delegate: ReaderFormatModuleDelegate?) {
        self.delegate = delegate
    }

    func supports(_ publication: Publication) -> Bool {
        publication.conforms(to: .divina)
    }

    func makeReaderViewController(
        for publication: Publication,
        locator: ReadiumShared.Locator?,
        bookId: String,
        selectionActions: [SelectionActionData]?
    ) throws -> ReaderViewController {
        try CBZViewController(
            publication: publication,
            locator: locator,
            bookId: bookId
        )
    }
}

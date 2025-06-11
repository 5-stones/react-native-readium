import Foundation
import UIKit
import R2Shared


final class EPUBModule: ReaderFormatModule {

    weak var delegate: ReaderFormatModuleDelegate?

    init(delegate: ReaderFormatModuleDelegate?) {
        self.delegate = delegate
    }

    func supports(_ publication: Publication) -> Bool {
      publication.conforms(to: .epub)
        || publication.readingOrder.allAreHTML
    }

    func makeReaderViewController(
      for publication: Publication,
      locator: Locator?,
      bookId: String
    ) throws -> ReaderViewController {
        guard publication.metadata.identifier != nil else {
            throw ReaderError.epubNotValid
        }

        let epubViewController = try EPUBViewController(
            publication: publication,
            locator: locator,
            bookId: bookId
        )
        epubViewController.moduleDelegate = delegate
        return epubViewController
    }

}

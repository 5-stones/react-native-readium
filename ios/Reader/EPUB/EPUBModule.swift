import Foundation
import UIKit
import R2Shared


final class EPUBModule: ReaderFormatModule {

    weak var delegate: ReaderFormatModuleDelegate?

    init(delegate: ReaderFormatModuleDelegate?) {
        self.delegate = delegate
    }

    var publicationFormats: [Publication.Format] {
        return [.epub, .webpub]
    }

    func makeReaderViewController(
      for publication: Publication,
      locator: Locator?,
      bookId: String,
      resourcesServer: ResourcesServer
    ) throws -> ReaderViewController {
        guard publication.metadata.identifier != nil else {
            throw ReaderError.epubNotValid
        }

        let epubViewController = EPUBViewController(
            publication: publication,
            locator: locator,
            bookId: bookId,
            resourcesServer: resourcesServer
        )
        epubViewController.moduleDelegate = delegate
        return epubViewController
    }

}

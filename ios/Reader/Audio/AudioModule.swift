import Foundation
import UIKit
import ReadiumShared

final class AudioModule: ReaderFormatModule {

  weak var delegate: ReaderFormatModuleDelegate?

  init(delegate: ReaderFormatModuleDelegate?) {
    self.delegate = delegate
  }

  func supports(_ publication: Publication) -> Bool {
    return publication.conforms(to: .audiobook)
      || publication.readingOrder.allAreAudio
  }

  func makeReaderViewController(
    for publication: Publication,
    locator: ReadiumShared.Locator?,
    bookId: String,
    selectionActions: [SelectionActionData]?
  ) throws -> ReaderViewController {
    let vc = AudioReaderViewController(
      publication: publication,
      locator: locator,
      bookId: bookId
    )
    vc.moduleDelegate = delegate
    return vc
  }
}

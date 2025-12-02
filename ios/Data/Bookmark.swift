import Combine
import Foundation
import ReadiumShared

struct Bookmark {
  let id: String?
  /// Foreign key to the publication.
  var bookId: String
  /// Location in the publication.
  var locator: Locator
  /// Progression in the publication, extracted from the locator.
  var progression: Double?
  /// Date of creation.
  var created: Date = Date()

  init(id: String? = nil, bookId: String, locator: Locator, created: Date = Date()) {
    self.id = id
    self.bookId = bookId
    self.locator = locator
    self.progression = locator.locations.totalProgression
    self.created = created
  }
}

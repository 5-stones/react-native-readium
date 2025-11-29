import CoreServices
import Foundation
import ReadiumShared

extension Publication {

  /// Finds all the downloadable links for this publication.
  var downloadLinks: [Link] {
    links.filter {
      if let mediaType = $0.mediaType?.string, DocumentTypes.main.supportsMediaType(mediaType) {
        return true
      }

      let hrefURL = $0.url(relativeTo: URL?.none).url
      return DocumentTypes.main.supportsFileExtension(hrefURL.pathExtension)
    }
  }

}

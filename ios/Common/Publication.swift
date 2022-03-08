import CoreServices
import Foundation
import R2Shared

extension Publication {

  /// Finds all the downloadable links for this publication.
  var downloadLinks: [Link] {
    links.filter {
      return DocumentTypes.main.supportsMediaType($0.type)
        || DocumentTypes.main.supportsFileExtension($0.url(relativeTo: nil)?.pathExtension)
    }
  }

}

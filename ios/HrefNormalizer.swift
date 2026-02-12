import Foundation
import ReadiumShared

/// Result of normalizing a Nitro href string for use with Readium 3.x SDK.
struct NormalizedHref {
  /// The resource path without leading "/" or fragment (e.g. "OEBPS/chapter1.xhtml")
  let resourcePath: String
  /// The fragment identifier without "#" prefix (e.g. "pgepubid00005"), if present
  let fragment: String?
}

/// Normalizes an href string from the JS/Nitro layer for use with the Readium 3.x SDK.
///
/// Handles two issues:
/// - Readium 3.x uses relative hrefs (e.g. "OEBPS/chapter1.xhtml") rather than
///   root-relative ("/OEBPS/chapter1.xhtml") which was the convention in Readium 2.x.
/// - Readium 3.x expects fragment identifiers (e.g. "#chapter1") in
///   `Locator.Locations.fragments`, not embedded in the href URL.
func normalizeHref(_ href: String) -> NormalizedHref {
  let withoutSlash = href.hasPrefix("/") ? String(href.dropFirst()) : href

  if let fragmentIndex = withoutSlash.firstIndex(of: "#") {
    return NormalizedHref(
      resourcePath: String(withoutSlash[..<fragmentIndex]),
      fragment: String(withoutSlash[withoutSlash.index(after: fragmentIndex)...])
    )
  }

  return NormalizedHref(resourcePath: withoutSlash, fragment: nil)
}

/// Converts a normalized href to an AnyURL suitable for Readium Locator construction.
///
/// Returns `nil` if the resource path cannot be parsed as a valid URL.
func anyURLFromNitroHref(_ href: String) -> AnyURL? {
  let normalized = normalizeHref(href)
  return AnyURL(string: normalized.resourcePath)
}

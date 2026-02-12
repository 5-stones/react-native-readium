package com.reactnativereadium.utils

/**
 * Result of normalizing a Nitro href string for use with the Readium 3.x SDK.
 *
 * @property resourcePath The resource path without leading "/" or fragment (e.g. "OEBPS/chapter1.xhtml")
 * @property fragment The fragment identifier without "#" prefix (e.g. "pgepubid00005"), or null if not present
 */
data class NormalizedHref(val resourcePath: String, val fragment: String?)

/**
 * Normalizes an href string from the JS/Nitro layer for use with the Readium 3.x SDK.
 *
 * Handles two issues:
 * - Readium 3.x uses relative hrefs (e.g. "OEBPS/chapter1.xhtml") rather than
 *   root-relative ("/OEBPS/chapter1.xhtml") which was the convention in Readium 2.x.
 * - Readium 3.x expects fragment identifiers (e.g. "#chapter1") in
 *   `Locator.Locations.fragments`, not embedded in the href URL.
 */
fun normalizeHref(href: String): NormalizedHref {
  val withoutSlash = if (href.startsWith("/")) href.removePrefix("/") else href
  val fragmentIndex = withoutSlash.indexOf('#')

  return if (fragmentIndex >= 0) {
    NormalizedHref(
      resourcePath = withoutSlash.substring(0, fragmentIndex),
      fragment = withoutSlash.substring(fragmentIndex + 1)
    )
  } else {
    NormalizedHref(resourcePath = withoutSlash, fragment = null)
  }
}

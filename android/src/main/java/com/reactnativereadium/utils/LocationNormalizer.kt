package com.reactnativereadium.utils

import org.json.JSONObject

/**
 * Normalizes an href by removing leading slashes for consistency across platforms.
 *
 * The Readium toolkit expects hrefs in relative format (e.g., "OPS/main3.xml")
 * rather than absolute format (e.g., "/OPS/main3.xml").
 *
 * @param href The href to normalize
 * @return The normalized href without leading slash
 */
fun normalizeHref(href: String): String {
  return if (href.startsWith("/")) {
    href.removePrefix("/")
  } else {
    href
  }
}

/**
 * Normalizes a location JSONObject by normalizing its href.
 *
 * @param location The location JSONObject to normalize
 * @return A new JSONObject with normalized href
 */
fun normalizeLocation(location: JSONObject): JSONObject {
  val normalized = JSONObject(location.toString()) // Deep copy

  if (normalized.has("href")) {
    val href = normalized.getString("href")
    val normalizedHref = normalizeHref(href)
    if (href != normalizedHref) {
      normalized.put("href", normalizedHref)
    }
  }

  return normalized
}

/**
 * Extension function to normalize the href in a JSONObject.
 *
 * @return A new JSONObject with normalized href
 */
fun JSONObject.normalizedLocation(): JSONObject = normalizeLocation(this)

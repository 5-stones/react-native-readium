package com.reactnativereadium.utils

import java.io.File
import java.net.URI

/**
 * The file at [path]: an absolute path, or a `file://` URL (percent-decoded), as iOS accepts.
 * Null for a malformed `file://` URL.
 */
fun fileFromPath(path: String): File? =
  if (path.startsWith("file:", ignoreCase = true)) {
    runCatching { File(URI(path)) }.getOrNull()
  } else {
    File(path)
  }

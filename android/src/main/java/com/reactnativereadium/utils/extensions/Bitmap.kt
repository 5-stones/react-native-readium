package com.reactnativereadium.utils.extensions

import android.graphics.Bitmap
import android.util.Base64
import timber.log.Timber
import java.io.ByteArrayOutputStream

/**
 * Converts the receiver bitmap into a data URL ready to be used in HTML or CSS.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
 */
fun Bitmap.toDataUrl(): String? =
    try {
        val stream = ByteArrayOutputStream()
        compress(Bitmap.CompressFormat.PNG, 100, stream)
            .also { success -> if (!success) throw Exception("Can't compress image to PNG") }
        val b64 = Base64.encodeToString(stream.toByteArray(), Base64.DEFAULT)
        "data:image/png;base64,$b64"
    } catch (e: Exception) {
        Timber.e(e)
        null
    }

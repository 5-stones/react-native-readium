package com.reactnativereadium.utils.extensions

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.readium.r2.shared.extensions.extension
import org.readium.r2.shared.extensions.tryOr
import org.readium.r2.shared.extensions.tryOrNull
import java.io.File
import java.io.FileOutputStream
import java.net.URL
import java.util.*

suspend fun URL.download(path: String): File? = tryOr(null) {
    val file = File(path)
    withContext(Dispatchers.IO) {
        openStream().use { input ->
            FileOutputStream(file).use { output ->
                input.copyTo(output)
            }
        }
    }
    file
}

suspend fun URL.copyToTempFile(dir: String): File? = tryOrNull {
    val filename = UUID.randomUUID().toString()
    val path = "$dir$filename.$extension"
    download(path)
}

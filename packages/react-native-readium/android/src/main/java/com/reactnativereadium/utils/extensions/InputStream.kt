package com.reactnativereadium.utils.extensions

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.InputStream

suspend fun InputStream.toFile(path: String) {
    withContext(Dispatchers.IO) {
        use { input ->
            File(path).outputStream().use { input.copyTo(it) }
        }
    }
}

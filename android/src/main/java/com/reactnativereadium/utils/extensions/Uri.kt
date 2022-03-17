package com.reactnativereadium.utils.extensions

import android.content.Context
import android.net.Uri
import org.readium.r2.shared.extensions.tryOrNull
import org.readium.r2.shared.util.mediatype.MediaType
import com.reactnativereadium.utils.ContentResolverUtil
import java.io.File
import java.util.*

suspend fun Uri.copyToTempFile(context: Context, dir: String): File? = tryOrNull {
    val filename = UUID.randomUUID().toString()
    val mediaType = MediaType.ofUri(this, context.contentResolver)
    val path = "$dir$filename.${mediaType?.fileExtension ?: "tmp"}"
    ContentResolverUtil.getContentInputStream(context, this, path)
    return@tryOrNull File(path)
}

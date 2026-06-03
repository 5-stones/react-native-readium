package com.reactnativereadium.reader

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.util.RNLog
import com.reactnativereadium.utils.LinkOrLocator
import java.io.File
import java.util.Locale
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.publication.Publication
import org.readium.r2.shared.util.FileExtension
import org.readium.r2.shared.util.asset.AssetRetriever
import org.readium.r2.shared.util.format.FormatHints
import org.readium.r2.shared.util.http.DefaultHttpClient
import org.readium.r2.shared.util.toUrl
import org.readium.r2.streamer.PublicationOpener
import org.readium.r2.streamer.parser.DefaultPublicationParser
import org.readium.adapter.pdfium.document.PdfiumDocumentFactory


class ReaderService(
  private val reactContext: ReactApplicationContext
) {
  private val httpClient = DefaultHttpClient()
  private val assetRetriever = AssetRetriever(
    reactContext.contentResolver,
    httpClient
  )
  private val publicationOpener = PublicationOpener(
    publicationParser = DefaultPublicationParser(
      context = reactContext,
      assetRetriever = assetRetriever,
      httpClient = httpClient,
      pdfFactory = PdfiumDocumentFactory(reactContext),
    )
  )

  fun locatorFromLinkOrLocator(
    location: LinkOrLocator?,
    publication: Publication,
  ): Locator? {

    if (location == null) return null

    when (location) {
      is LinkOrLocator.Link -> {
        return publication.locatorFromLink(location.link)
      }
      is LinkOrLocator.Locator -> {
        return location.locator
      }
    }

    return null
  }

  private suspend fun cachePDF(urlString: String): String = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
    if ((urlString.startsWith("http://") || urlString.startsWith("https://")) &&
        (urlString.substringBefore("?").endsWith(".pdf") || urlString.contains(".pdf"))) {
      try {
        val remoteUrl = java.net.URL(urlString)
        val urlHash = urlString.substringBefore("?").hashCode().toString()
        val localFile = File(reactContext.cacheDir, "$urlHash.pdf")

        if (localFile.exists() && localFile.length() > 0) {
          return@withContext localFile.absolutePath
        }

        val connection = remoteUrl.openConnection() as java.net.HttpURLConnection
        connection.requestMethod = "GET"
        connection.connect()

        if (connection.responseCode == java.net.HttpURLConnection.HTTP_OK) {
          connection.inputStream.use { input ->
            localFile.outputStream().use { output ->
              input.copyTo(output)
            }
          }
          return@withContext localFile.absolutePath
        }
      } catch (e: Exception) {
        e.printStackTrace()
      }
    }
    return@withContext urlString
  }

  suspend fun openPublication(
    fileName: String,
    initialLocation: LinkOrLocator?,
    callback: suspend (fragment: BaseReaderFragment) -> Unit
  ) {
    val targetPath = cachePDF(fileName)

    val publicationUrl = if (targetPath.startsWith("http://") || targetPath.startsWith("https://")) {
      runCatching { org.readium.r2.shared.util.AbsoluteUrl(targetPath) }.getOrNull()
    } else {
      val targetFile = File(targetPath).absoluteFile
      if (!targetFile.exists()) {
        RNLog.e(reactContext, "Failed to open publication: File does not exist: $targetPath")
        return
      }
      runCatching { org.readium.r2.shared.util.AbsoluteUrl(targetFile.toURI().toString()) }.getOrNull()
    }

    if (publicationUrl == null) {
      RNLog.e(reactContext, "Invalid publication layout. AbsoluteUrl creation aborted for path: $targetPath")
      return
    }

    val fileExtension = if (targetPath.startsWith("http")) {
      targetPath.substringBefore("?").substringAfterLast(".", "")
    } else {
      File(targetPath).extension
    }.takeIf { it.isNotEmpty() }?.lowercase(Locale.ROOT)

    val asset = assetRetriever
      .retrieve(
        url = publicationUrl,
        formatHints = FormatHints(fileExtension = fileExtension?.let { FileExtension(it) })
      )
      .onFailure {
        RNLog.w(reactContext, "Unable to retrieve publication asset: ${it.message}")
      }
      .getOrNull()
      ?: return

    publicationOpener
      .open(
        asset = asset,
        allowUserInteraction = false
      )
      .onSuccess { publication ->
        val locator = locatorFromLinkOrLocator(initialLocation, publication)

        val readerFragment: BaseReaderFragment = when {
          publication.conformsTo(Publication.Profile.PDF) -> {
            val frag = PdfReaderFragment.newInstance()
            frag.initFactory(publication, locator)
            frag
          }
          else -> {
            val frag = EpubReaderFragment.newInstance()
            frag.initFactory(publication, locator)
            frag
          }
        }

        callback.invoke(readerFragment)
      }
      .onFailure {
        RNLog.w(
          reactContext,
          "Error executing ReaderService.openPublication: ${it.message}"
        )
        // TODO: implement failure event
      }
  }

  sealed class Event {

    class ImportPublicationFailed(val errorMessage: String?) : Event()

    object UnableToMovePublication : Event()

    object ImportPublicationSuccess : Event()

    object ImportDatabaseFailed : Event()

    class OpenBookError(val errorMessage: String?) : Event()
  }
}
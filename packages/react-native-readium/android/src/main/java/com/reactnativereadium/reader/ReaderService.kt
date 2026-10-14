package com.reactnativereadium.reader

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.util.RNLog
import com.margelo.nitro.reactnativereadium.PublicationErrorCode
import com.reactnativereadium.utils.LinkOrLocator
import com.reactnativereadium.utils.fileFromPath
import java.util.Locale
import kotlin.time.Duration.Companion.seconds
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.publication.Publication
import org.readium.r2.shared.publication.firstWithHref
import org.readium.r2.shared.publication.protection.FallbackContentProtection
import org.readium.r2.shared.publication.services.isRestricted
import org.readium.r2.shared.publication.services.protectionScheme
import org.readium.r2.shared.publication.services.protectionError
import org.readium.r2.shared.util.FileExtension
import org.readium.r2.shared.util.asset.AssetRetriever
import org.readium.r2.shared.util.format.FormatHints
import org.readium.r2.shared.util.AbsoluteUrl
import org.readium.r2.shared.util.data.ReadError
import org.readium.r2.shared.util.asset.DefaultArchiveOpener
import org.readium.r2.shared.util.asset.DefaultFormatSniffer
import org.readium.r2.shared.util.asset.DefaultResourceFactory
import org.readium.r2.shared.util.http.DefaultHttpClient
import org.readium.r2.streamer.PublicationOpener
import org.readium.r2.streamer.parser.DefaultPublicationParser
import org.readium.adapter.pdfium.document.PdfiumDocumentFactory


class ReaderService(
  private val reactContext: ReactApplicationContext
) {
  private val httpClient = DefaultHttpClient(
    connectTimeout = CONNECT_TIMEOUT,
    readTimeout = READ_TIMEOUT
  )

  /**
   * Where the open publication's resources are fetched from. Replaced to move
   * a publication whose location has expired; read on every read, so the next
   * one uses it.
   */
  @Volatile
  var sourceLocation: AbsoluteUrl? = null
    private set

  fun setSourceLocation(url: AbsoluteUrl?) {
    sourceLocation = url
  }

  /**
   * Answers a failed read: moves the location and returns true to have the
   * read tried again. Set by the view, which owns the policy.
   */
  @Volatile
  var recoverRead: (suspend (url: AbsoluteUrl, error: ReadError) -> Boolean)? =
    null

  /** A read succeeded, which is what makes the location trustworthy again. */
  @Volatile
  var onReadSucceeded: (() -> Unit)? = null

  /** A publication is about to open, so anything held about the last one is stale. */
  @Volatile
  var onPublicationOpening: (() -> Unit)? = null

  private val assetRetriever = AssetRetriever(
    RebasingResourceFactory(
      currentUrl = { sourceLocation },
      inner = DefaultResourceFactory(reactContext.contentResolver, httpClient),
      recover = { url, error -> recoverRead?.invoke(url, error) ?: false },
      noteSuccess = { onReadSucceeded?.invoke() }
    ),
    DefaultArchiveOpener(),
    DefaultFormatSniffer()
  )
  private val publicationParser = DefaultPublicationParser(
    context = reactContext,
    assetRetriever = assetRetriever,
    httpClient = httpClient,
    pdfFactory = PdfiumDocumentFactory(reactContext),
  )

  /**
   * Realigns a stored locator against the publication that was actually opened.
   *
   * A locator can name a resource this publication doesn't have: one persisted by an
   * older web build for a PDF carries no resource at all, and the Readium toolkits name
   * a standalone file `publication.<ext>` rather than using its on-disk filename. The
   * reading position itself is still good in both cases, so rebase the locator onto the
   * first reading-order resource rather than letting the navigator discard it and reopen
   * at the beginning.
   */
  private fun resolveAgainstPublication(
    locator: Locator,
    publication: Publication,
  ): Locator {
    if (publication.readingOrder.firstWithHref(locator.href) != null) return locator
    val first = publication.readingOrder.firstOrNull() ?: return locator

    return locator.copy(
      href = first.url(),
      mediaType = first.mediaType ?: locator.mediaType,
    )
  }

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
        return resolveAgainstPublication(location.locator, publication)
      }
    }

    return null
  }

  suspend fun openPublication(
    fileName: String,
    initialLocation: LinkOrLocator?,
    credentials: String?,
    onError: (OpenError) -> Unit,
    callback: suspend (fragment: BaseReaderFragment) -> Unit
  ) {
    // A location belongs to the publication it was resolved for. Carrying one
    // into the next open would have that publication's resources read from the
    // previous one's location — the wrong book, under the right title.
    sourceLocation = null
    onPublicationOpening?.invoke()

    val publicationUrl = if (fileName.startsWith("http://") || fileName.startsWith("https://")) {
      runCatching { org.readium.r2.shared.util.AbsoluteUrl(fileName) }.getOrNull()
    } else {
      val targetFile = fileFromPath(fileName)?.absoluteFile
      if (targetFile == null || !targetFile.exists()) {
        RNLog.e(reactContext, "Failed to open publication: File does not exist: $fileName")
        onError(OpenError(PublicationErrorCode.FILENOTFOUND, "File does not exist: $fileName"))
        return
      }
      runCatching {
        org.readium.r2.shared.util.AbsoluteUrl(
          targetFile.toURI().toString()
        )
      }.getOrNull()
    }

    if (publicationUrl == null) {
      RNLog.e(
        reactContext,
        "Invalid publication layout. AbsoluteUrl creation aborted for path: $fileName"
      )
      onError(OpenError(PublicationErrorCode.OPENFAILED, "Invalid publication URL: $fileName"))
      return
    }

    val fileExtension = if (fileName.startsWith("http://") || fileName.startsWith("https://")) {
      fileName.substringBefore("?").substringAfterLast(".", "")
    } else {
      fileFromPath(fileName)?.extension.orEmpty()
    }.takeIf { it.isNotEmpty() }?.lowercase(Locale.ROOT)

    val asset = assetRetriever
      .retrieve(
        publicationUrl,
        FormatHints(fileExtension = fileExtension?.let { FileExtension(it) })
      )
      .onFailure {
        RNLog.w(reactContext, "Unable to retrieve publication asset: ${it.message}")
        val code = when (it) {
          is AssetRetriever.RetrieveUrlError.FormatNotSupported -> PublicationErrorCode.FORMATNOTSUPPORTED
          else -> PublicationErrorCode.OPENFAILED
        }
        onError(OpenError(code, it.message))
      }
      .getOrNull()
      ?: return

    // Built per open so a protection registered after this view mounted still applies.
    val publicationOpener = PublicationOpener(
      publicationParser = publicationParser,
      contentProtections = ReaderContentProtectionRegistry.protections,
    )

    publicationOpener
      .open(
        asset = asset,
        credentials = credentials,
        // Opened to render, so a protection may ask for credentials, as on iOS.
        allowUserInteraction = true
      )
      .onSuccess { publication ->
        if (publication.isRestricted) {
          val error = publication.protectionError
          RNLog.w(reactContext, "Unable to open restricted publication: ${error?.message}")
          onError(OpenError(
            code = when (error) {
              null -> PublicationErrorCode.CANCELLED
              is FallbackContentProtection.SchemeNotSupportedError -> PublicationErrorCode.PROTECTIONNOTSUPPORTED
              else -> PublicationErrorCode.RESTRICTED
            },
            message = error?.message ?: "Access to the publication was not granted.",
            protectionScheme = publication.protectionScheme?.uri
          ))
          publication.close()
          return@onSuccess
        }

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
        val code = when (it) {
          is PublicationOpener.OpenError.FormatNotSupported -> PublicationErrorCode.FORMATNOTSUPPORTED
          else -> PublicationErrorCode.OPENFAILED
        }
        onError(OpenError(code, it.message))
      }
  }

  /** A failed open, reported to JS as a `PublicationErrorEvent`. */
  class OpenError(
    val code: PublicationErrorCode,
    val message: String,
    val protectionScheme: String? = null,
  )

  sealed class Event {

    class ImportPublicationFailed(val errorMessage: String?) : Event()

    object UnableToMovePublication : Event()

    object ImportPublicationSuccess : Event()

    object ImportDatabaseFailed : Event()

    class OpenBookError(val errorMessage: String?) : Event()
  }

  companion object {
    /**
     * How long a request for a publication's bytes may stall before it fails.
     *
     * Unset, `HttpURLConnection` waits forever: a CDN that stops answering
     * leaves a blank page and nothing to report, because the navigator cannot
     * paint a page until the read behind it returns. Bounding the stall turns
     * that into a `readFailed` the consumer can act on.
     *
     * Mirrors `requestTimeout` in `ReaderService.swift`. Web caps a whole
     * request instead, for want of a stall to measure; see
     * `SOURCE_REQUEST_TIMEOUT_MS` in `web/utils/publicationFetch.ts`.
     */
    private val CONNECT_TIMEOUT = 15.seconds
    private val READ_TIMEOUT = 15.seconds
  }
}

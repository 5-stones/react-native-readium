package com.reactnativereadium.reader

import org.readium.r2.shared.util.AbsoluteUrl
import org.readium.r2.shared.util.Try
import org.readium.r2.shared.util.data.ReadError
import org.readium.r2.shared.util.resource.Resource
import org.readium.r2.shared.util.resource.ResourceFactory

/**
 * Where a publication's resources are fetched from, answered when a read
 * happens rather than when the publication opened.
 *
 * `HttpResource` holds its url in a `val` and rebuilds every request from it,
 * so a publication opened at one location can never be moved to another. That
 * is fine until a credential in the location expires. This asks for the
 * location per read instead, so replacing it is enough — no reopening, and the
 * reading position is never disturbed.
 *
 * @param currentUrl Read on every read; null falls back to where the resource
 *   was made for.
 * @param inner Makes the resource actually read from, once a location is known.
 */
class RebasingResourceFactory(
  private val currentUrl: () -> AbsoluteUrl?,
  private val inner: ResourceFactory,
  /**
   * Answers a failed read: moves the location and returns true to have the
   * read tried again, or false to let the failure stand.
   */
  private val recover: suspend (url: AbsoluteUrl, error: ReadError) -> Boolean =
    { _, _ -> false },
  /** Called whenever a read succeeds, so [recover] can tell a location that
   *  works from one that only looked like it might. */
  private val noteSuccess: () -> Unit = {}
) : ResourceFactory {

  override suspend fun create(
    url: AbsoluteUrl
  ): Try<Resource, ResourceFactory.Error> =
    Try.success(RebasingResource(url, currentUrl, inner, recover, noteSuccess))
}

/** A resource that resolves its location per read. See [RebasingResourceFactory]. */
private class RebasingResource(
  private val openedAt: AbsoluteUrl,
  private val currentUrl: () -> AbsoluteUrl?,
  private val inner: ResourceFactory,
  private val recover: suspend (url: AbsoluteUrl, error: ReadError) -> Boolean,
  private val noteSuccess: () -> Unit
) : Resource {

  /** The delegate in use and the location it was made for, dropped when that moves. */
  private var delegate: Pair<AbsoluteUrl, Resource>? = null

  /** The location now in use. Truthful per read: callers read it to decide
   *  whether they can reach the content more directly. */
  override val sourceUrl: AbsoluteUrl
    get() = currentUrl() ?: openedAt

  private suspend fun resource(): Try<Resource, ReadError> {
    val url = currentUrl() ?: openedAt

    delegate?.let { (at, resource) ->
      if (at.toString() == url.toString()) return Try.success(resource)
      // Dropped as well as closed: making the next one can fail, and a closed
      // resource must not be handed out if the location moves back.
      resource.close()
      delegate = null
    }

    return when (val made = inner.create(url)) {
      is Try.Success -> {
        delegate = url to made.value
        Try.success(made.value)
      }
      // The only way this fails is an unsupported scheme, which is passed
      // through rather than dressed up as something that happened while
      // reading.
      is Try.Failure -> Try.failure(ReadError.UnsupportedOperation(made.value))
    }
  }

  /**
   * Runs a read, and on failure gives [recover] a chance to move the location
   * and have it tried once more.
   *
   * Retrying here rather than reporting is what keeps the failure invisible:
   * the navigator does not retry a read of its own, so a failure that escapes
   * costs the reader the page they were turning to.
   */
  private suspend fun <S> attempt(
    read: suspend () -> Try<S, ReadError>
  ): Try<S, ReadError> {
    val first = read()
    if (first !is Try.Failure) {
      noteSuccess()
      return first
    }

    val movedTo = runCatching { recover(sourceUrl, first.value) }
      .getOrDefault(false)
    if (!movedTo) return first

    // `resource()` picks up the new location, so this reads from it.
    val second = read()
    if (second !is Try.Failure) noteSuccess()
    return second
  }

  override suspend fun properties() =
    attempt {
      when (val resource = resource()) {
        is Try.Success -> resource.value.properties()
        is Try.Failure -> Try.failure(resource.value)
      }
    }

  override suspend fun length() =
    attempt {
      when (val resource = resource()) {
        is Try.Success -> resource.value.length()
        is Try.Failure -> Try.failure(resource.value)
      }
    }

  override suspend fun read(range: LongRange?) =
    attempt {
      when (val resource = resource()) {
        is Try.Success -> resource.value.read(range)
        is Try.Failure -> Try.failure(resource.value)
      }
    }

  override fun close() {
    delegate?.second?.close()
    delegate = null
  }
}

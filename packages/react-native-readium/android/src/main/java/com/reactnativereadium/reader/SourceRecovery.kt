package com.reactnativereadium.reader

import com.margelo.nitro.reactnativereadium.PublicationErrorKind
import com.margelo.nitro.reactnativereadium.SourceRequestFailure
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.cancel
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeoutOrNull
import org.readium.r2.shared.util.data.ReadError
import org.readium.r2.shared.util.http.HttpError

/**
 * Answers a failed read by moving the publication to a location that works.
 *
 * The native half of what `relocationGuard.ts` does on web, and kept apart
 * from the view for the same reason: deciding whether a failure is worth a new
 * location, asking for one, and knowing when to stop asking is a concern of
 * its own.
 *
 * @param identity The publication's `file.url`, which names it and is never
 *   fetched — what a new location is asked for.
 * @param currentLocation The location in use now, or null while the
 *   publication is still being read from where it opened.
 * @param apply Puts a location in use; false when it was not usable. The
 *   next read finds it.
 * @param report A read was given up on. Told at most once per location until
 *   one succeeds.
 */
internal class SourceRecovery(
  private val identity: () -> String?,
  private val currentLocation: () -> String?,
  private val apply: (String) -> Boolean,
  private val report: (SourceRequestFailure) -> Unit,
  /**
   * Relocations allowed without a read succeeding in between, and how long a
   * failed read waits for an answer. Defaults mirror
   * `MAX_CONSECUTIVE_RELOCATIONS` and `SOURCE_RECOVERY_TIMEOUT_MS` in
   * `web/utils/relocationGuard.ts`, and `maxConsecutiveRelocations` and
   * `timeout` in `SourceRecovery.swift`. Keep the three in step.
   *
   * Parameters so that a test need not wait ten seconds to watch one lapse.
   */
  private val maxConsecutiveRelocations: Int = 2,
  private val timeoutMs: Long = 10_000L,
  /**
   * Where an attempt runs, which is deliberately not the coroutine of the read
   * that asked for it. See [answer].
   */
  private val scope: CoroutineScope =
    CoroutineScope(SupervisorJob() + Dispatchers.Default)
) {
  /**
   * Asked for a location, and asked whether a failure deserves one. Both are
   * the consumer's, and either may be unset: without a resolver there is
   * nothing to ask, and without a predicate the policy below decides.
   *
   * Plain suspending functions rather than the view's own callbacks: what
   * crosses the bridge, and how an answer is awaited, is the view's business.
   * Keeping it there is also what lets this be tested without one.
   */
  @Volatile
  var resolveLocation: (suspend (identity: String) -> String?)? = null

  @Volatile
  var shouldRefresh: (suspend (failure: SourceRequestFailure) -> Boolean)? = null

  /** Guards [inFlight]. Held only long enough to claim or find an attempt. */
  private val answering = Mutex()

  /**
   * The attempt every read in flight shares.
   *
   * An expiring credential fails every read at once, and each would otherwise
   * ask the consumer for its own location. They ride one answer instead, as
   * they do on iOS and web.
   */
  @Volatile
  private var inFlight: Deferred<Boolean>? = null

  /**
   * Relocations since a read last succeeded. A read that succeeds restores the
   * budget: a location is worth replacing however often it expires, but
   * replacing it repeatedly without a read ever succeeding is a loop rather
   * than an expiry.
   *
   * Written under [answering], and also from a read on whatever thread it
   * happened on, by way of [noteReadSucceeded].
   */
  @Volatile
  private var consecutiveRelocations = 0

  /** The location a decline was last reported for. See [report]. */
  @Volatile
  private var declinedFor: String? = null

  /** A read succeeded, so the location is answering and the budget is whole. */
  fun noteReadSucceeded() {
    consecutiveRelocations = 0
    declinedFor = null
  }

  /**
   * Answers a failed read. Returns whether a location the read can be retried
   * against is now in use.
   *
   * The asking happens in [scope] rather than here, and is awaited with a
   * deadline, because `Promise.await` cannot be cancelled: a consumer whose
   * promise never settles would otherwise hold this read — and, since every
   * read shares one attempt, every other read with it — for as long as the
   * publication is open. The attempt may therefore outlive everyone waiting
   * on it, which is harmless: a late answer moves the location, and the next
   * read finds it.
   */
  suspend fun answer(observed: String, error: ReadError): Boolean {
    val failure = failureOf(observed, error)

    // Another failed read already moved the location, so this one only needs
    // trying again.
    val current = currentLocation()
    if (current != null && current != observed) return true

    // Nothing to ask: the consumer is not using `resolveSource`, so this
    // failure is theirs to see however it would have surfaced anyway.
    if (resolveLocation == null) return false

    if (consecutiveRelocations >= maxConsecutiveRelocations) {
      decline(failure)
      return false
    }

    val attempt = claim(failure)

    // Nothing came back in time. JS may yet answer, but this read cannot wait
    // on it, so the failure stands and is ours to report.
    val moved = withTimeoutOrNull(timeoutMs) { attempt.await() }
    if (moved == null) {
      decline(failure)
      return false
    }

    return moved
  }

  /**
   * The attempt in flight, or a new one that this read starts.
   *
   * Started outside the lock, and cleared without taking it: [answering] is
   * not reentrant, so an attempt that both runs and finishes while its
   * claimer still holds the lock would clear [inFlight] before the claimer
   * returned — and the next failed read would start a second attempt for the
   * same wave, which is the one thing this exists to prevent.
   */
  private suspend fun claim(failure: SourceRequestFailure): Deferred<Boolean> {
    val attempt = answering.withLock {
      inFlight ?: scope
        .async(start = CoroutineStart.LAZY) { relocate(failure) }
        .also { started ->
          inFlight = started
          // `invokeOnCompletion` cannot suspend, so it cannot take the lock —
          // which is why the claim is the only thing the lock guards.
          started.invokeOnCompletion {
            if (inFlight === started) inFlight = null
          }
        }
    }

    attempt.start()
    return attempt
  }

  /**
   * Gives up on anything still in flight, for a view that is going away.
   *
   * An attempt suspended in `Promise.await` cannot be cancelled — nitro
   * suspends on a plain continuation — so this does not free one that a
   * consumer never answers. It stops everything that can be stopped, and
   * stops new attempts being started on a scope nobody is waiting on.
   */
  fun close() {
    scope.cancel()
  }

  /**
   * Asks the consumer whether this failure deserves a new location, asks for
   * one, and puts it in use. Reports the failure where any of that declines.
   */
  private suspend fun relocate(failure: SourceRequestFailure): Boolean {
    val resolve = resolveLocation ?: return false

    val refresh = shouldRefresh?.invoke(failure)
      ?: looksRefreshable(failure.status)
    if (!refresh) {
      decline(failure)
      return false
    }

    // An empty answer is the consumer declining, and the answer may not be a
    // url at all, which the view says by refusing it.
    val next = resolve(identity() ?: failure.url)
    if (next.isNullOrEmpty() || !apply(next)) {
      decline(failure)
      return false
    }

    consecutiveRelocations += 1
    return true
  }

  /** What a failed read says about itself. */
  private fun failureOf(
    observed: String,
    error: ReadError
  ): SourceRequestFailure {
    val status = statusOf(error)
    return SourceRequestFailure(
      url = observed,
      status = status,
      // A status that was read is an HTTP answer; without one there is nothing
      // to tell a refusal from a connection that failed.
      kind = if (status == null) {
        PublicationErrorKind.UNREADABLE
      } else {
        PublicationErrorKind.HTTP
      },
      detail = error.message
    )
  }

  /**
   * Reports a read given up on, once per location until a read succeeds: an
   * expiring credential fails every read in flight, and the consumer wants to
   * hear that a page is missing, not hear it thirty times.
   */
  private fun decline(failure: SourceRequestFailure) {
    if (declinedFor == failure.url) return
    declinedFor = failure.url
    report(failure)
  }

  private companion object {
    /**
     * Whether a failed read is worth a new location, when the consumer has not
     * said: a refused or expired credential is what a 401 or 403 means, and
     * deciding it here means an ordinary expiry never round-trips to JS to be
     * classified.
     */
    fun looksRefreshable(status: Double?): Boolean =
      status == 401.0 || status == 403.0

    /** The status behind a read failure, where it was an HTTP response. */
    fun statusOf(error: ReadError): Double? =
      ((error as? ReadError.Access)?.cause as? HttpError.ErrorResponse)
        ?.status
        ?.code
        ?.toDouble()
  }
}

package com.reactnativereadium.reader

import com.margelo.nitro.reactnativereadium.PublicationErrorKind
import com.margelo.nitro.reactnativereadium.SourceRequestFailure
import kotlin.coroutines.suspendCoroutine
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.yield
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.readium.r2.shared.util.data.ReadError
import org.readium.r2.shared.util.http.HttpError
import org.readium.r2.shared.util.http.HttpStatus

/**
 * What the platform does with a failed read, and when it stops doing it.
 *
 * The same rules `relocationGuard.test.ts` holds web to, and the same ones
 * `SourceRecovery.swift` implements: policy, budget, deadline, and telling the
 * consumer once.
 */
class SourceRecoveryTest {
  private val identity = "https://api.test/publications/42"
  private val opened = "https://cdn.test/token-a/book.epub"
  private val fresh = "https://cdn.test/token-b/book.epub"

  /** A read that failed with an HTTP status the server actually sent. */
  private fun httpFailure(status: Int): ReadError =
    ReadError.Access(HttpError.ErrorResponse(HttpStatus(status)))

  /** A read that failed with nothing to read a status from. */
  private fun opaqueFailure(): ReadError =
    ReadError.Decoding("not a publication")

  /** A nitro callback's answer: a promise of a promise, both already kept. */
  private class Recorder {
    val requests = mutableListOf<String>()
    val applied = mutableListOf<String>()
    val reported = mutableListOf<SourceRequestFailure>()
    var location: String? = null
  }

  private fun recovery(
    recorder: Recorder,
    answers: (String) -> String? = { fresh },
    decide: ((SourceRequestFailure) -> Boolean)? = null,
    maxConsecutiveRelocations: Int = 2,
    timeoutMs: Long = 10_000L,
    hang: Boolean = false,
    /**
     * Suspends in a way nothing can cancel, which is how nitro's
     * `Promise.await` suspends: `suspendCoroutine`, with no continuation
     * handed back. A cancellable [delay] does not model it.
     */
    wedge: Boolean = false,
    scope: CoroutineScope = CoroutineScope(Dispatchers.Unconfined)
  ): SourceRecovery =
    SourceRecovery(
      identity = { identity },
      currentLocation = { recorder.location },
      apply = { url ->
        recorder.applied += url
        recorder.location = url
        true
      },
      report = { failure -> recorder.reported += failure },
      maxConsecutiveRelocations = maxConsecutiveRelocations,
      timeoutMs = timeoutMs,
      scope = scope
    ).apply {
      resolveLocation = { identity ->
        recorder.requests += identity
        when {
          wedge -> suspendCoroutine { }
          hang -> {
            delay(60_000)
            fresh
          }
          else -> answers(identity)
        }
      }
      decide?.let { predicate ->
        shouldRefresh = { failure -> predicate(failure) }
      }
    }

  // ── the policy ─────────────────────────────────────────────────────────────

  @Test
  fun `a 403 earns a new location, and the read is told to try again`() = runBlocking {
    val recorder = Recorder()
    val moved = recovery(recorder).answer(opened, httpFailure(403))

    assertTrue(moved)
    assertEquals(listOf(fresh), recorder.applied)
    assertEquals(identity, recorder.requests.single())
    assertTrue(recorder.reported.isEmpty())
  }

  @Test
  fun `a 401 earns one too`() = runBlocking {
    val recorder = Recorder()
    assertTrue(recovery(recorder).answer(opened, httpFailure(401)))
  }

  @Test
  fun `a 404 does not, and the consumer hears about it`() = runBlocking {
    val recorder = Recorder()
    val moved = recovery(recorder).answer(opened, httpFailure(404))

    assertFalse(moved)
    assertTrue(recorder.requests.isEmpty())
    assertEquals(404.0, recorder.reported.single().status)
    assertEquals(PublicationErrorKind.HTTP, recorder.reported.single().kind)
  }

  @Test
  fun `a failure with no status is reported as unreadable`() = runBlocking {
    val recorder = Recorder()
    recovery(recorder).answer(opened, opaqueFailure())

    assertNull(recorder.reported.single().status)
    assertEquals(PublicationErrorKind.UNREADABLE, recorder.reported.single().kind)
  }

  @Test
  fun `the consumer's predicate overrides the policy, both ways`() = runBlocking {
    val refusing = Recorder()
    assertFalse(
      recovery(refusing, decide = { false }).answer(opened, httpFailure(403))
    )
    assertTrue(refusing.requests.isEmpty())
    assertEquals(1, refusing.reported.size)

    val insisting = Recorder()
    assertTrue(
      recovery(insisting, decide = { true }).answer(opened, httpFailure(500))
    )
    assertEquals(listOf(fresh), insisting.applied)
  }

  @Test
  fun `nothing is asked when the consumer has no resolver`() = runBlocking {
    val recorder = Recorder()
    val bare = SourceRecovery(
      identity = { identity },
      currentLocation = { recorder.location },
      apply = { recorder.applied += it; true },
      report = { recorder.reported += it }
    )

    assertFalse(bare.answer(opened, httpFailure(403)))
    assertTrue(recorder.applied.isEmpty())
    // Theirs to see however it would have surfaced anyway.
    assertTrue(recorder.reported.isEmpty())
  }

  // ── answering twice ────────────────────────────────────────────────────────

  @Test
  fun `a failure at a location something else already replaced just retries`() =
    runBlocking {
      val recorder = Recorder()
      recorder.location = fresh

      assertTrue(recovery(recorder).answer(opened, httpFailure(403)))
      assertTrue(recorder.requests.isEmpty())
    }

  @Test
  fun `the budget runs out, and a read succeeding restores it`() = runBlocking {
    val recorder = Recorder()
    val recovery = recovery(recorder, answers = { recorder.location })

    // Each relocation answers with the location already in use, so nothing
    // ever succeeds and the budget is never restored.
    recorder.location = opened
    assertTrue(recovery.answer(opened, httpFailure(403)))
    assertTrue(recovery.answer(opened, httpFailure(403)))
    assertFalse(recovery.answer(opened, httpFailure(403)))
    assertEquals(2, recorder.requests.size)

    recovery.noteReadSucceeded()
    assertTrue(recovery.answer(opened, httpFailure(403)))
    assertEquals(3, recorder.requests.size)
  }

  @Test
  fun `a location is reported once, however many reads it fails`() = runBlocking {
    val recorder = Recorder()
    val recovery = recovery(recorder)

    recovery.answer(opened, httpFailure(404))
    recovery.answer(opened, httpFailure(404))
    recovery.answer(opened, httpFailure(404))
    assertEquals(1, recorder.reported.size)

    recovery.noteReadSucceeded()
    recovery.answer(opened, httpFailure(404))
    assertEquals(2, recorder.reported.size)
  }

  // ── declining, and never answering ─────────────────────────────────────────

  @Test
  fun `an empty answer is the consumer declining`() = runBlocking {
    val recorder = Recorder()
    val moved = recovery(recorder, answers = { null }).answer(opened, httpFailure(403))

    assertFalse(moved)
    assertTrue(recorder.applied.isEmpty())
    assertEquals(1, recorder.reported.size)
  }

  @Test
  fun `a consumer that never answers is given up on`() = runBlocking {
    val recorder = Recorder()
    val moved = recovery(recorder, timeoutMs = 50, hang = true)
      .answer(opened, httpFailure(403))

    assertFalse(moved)
    assertTrue(recorder.applied.isEmpty())
    assertEquals(1, recorder.reported.size)
  }

  /**
   * The deadline has to free the read even when nothing can cancel the asking,
   * which is the only kind of hang there is: nitro's `Promise.await` suspends
   * with `suspendCoroutine`, so a JS promise that never settles leaves a
   * coroutine that cancellation cannot reach. Timed out rather than left to
   * hang, because a wedged read is a reader that can never turn a page again.
   */
  @Test(timeout = 5_000)
  fun `a promise that never settles still frees the read`() = runBlocking {
    val recorder = Recorder()
    val moved = recovery(recorder, timeoutMs = 50, wedge = true)
      .answer(opened, httpFailure(403))

    assertFalse(moved)
    assertTrue(recorder.applied.isEmpty())
    assertEquals(1, recorder.reported.size)
  }

  /** And every later read, which shares that attempt, is freed as well. */
  @Test(timeout = 5_000)
  fun `a wedged attempt does not hold the reads behind it`() = runBlocking {
    val recorder = Recorder()
    val recovery = recovery(recorder, timeoutMs = 50, wedge = true)

    assertFalse(recovery.answer(opened, httpFailure(403)))
    assertFalse(recovery.answer(opened, httpFailure(403)))

    // Asked once, reported once, however many reads failed.
    assertEquals(1, recorder.requests.size)
    assertEquals(1, recorder.reported.size)
  }

  /**
   * The attempt is started outside the lock that claims it, so one that
   * resolves without ever suspending — which an eager dispatcher runs inline —
   * cannot reach its own cleanup while the read that started it still holds
   * that lock. [answering] is not reentrant, so that used to be one refactor
   * away from a deadlock.
   */
  @Test(timeout = 5_000)
  fun `an attempt that never suspends does not wedge the read`() = runBlocking {
    val recorder = Recorder()

    assertTrue(recovery(recorder).answer(opened, httpFailure(403)))
    assertEquals(listOf(fresh), recorder.applied)
    assertEquals(identity, recorder.requests.single())
  }

  /**
   * An expiring credential fails every read in flight at once. They ride one
   * answer, as they do on iOS and web — a token refresh per failed read is
   * what this avoids.
   */
  @Test(timeout = 5_000)
  fun `reads that fail together ask the consumer once`() = runBlocking {
    val recorder = Recorder()
    val gate = CompletableDeferred<Unit>()
    val recovery = recovery(recorder, answers = {
      runBlocking { gate.await() }
      fresh
    })

    val answers = (1..5).map {
      async { recovery.answer(opened, httpFailure(403)) }
    }
    // Let them all reach the attempt before it is allowed to finish.
    yield()
    gate.complete(Unit)

    assertEquals(List(5) { true }, answers.awaitAll())
    assertEquals(1, recorder.requests.size)
    assertEquals(1, recorder.applied.size)
  }
}

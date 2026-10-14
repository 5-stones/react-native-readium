import Foundation
import NitroModules
import ReadiumShared

/**
 Answers a failed read by moving the publication to a location that works.

 The native half of what `relocationGuard.ts` does on web, and kept apart from
 the view for the same reason: deciding whether a failure is worth a new
 location, asking for one, and knowing when to stop asking is a concern of its
 own.
 */
final class SourceRecovery {
  /// The publication's `file.url`, which names it and is never fetched — what
  /// a new location is asked for.
  private let identity: () -> String?
  /// The location in use now, or nil while the publication is still being read
  /// from where it opened.
  private let currentLocation: () -> String?
  /// Puts a location in use; false when it was not usable. The next read
  /// finds it.
  private let apply: (String) -> Bool
  /// A read was given up on. Told at most once per location until one succeeds.
  private let report: (SourceRequestFailure) -> Void

  init(
    identity: @escaping () -> String?,
    currentLocation: @escaping () -> String?,
    apply: @escaping (String) -> Bool,
    report: @escaping (SourceRequestFailure) -> Void
  ) {
    self.identity = identity
    self.currentLocation = currentLocation
    self.apply = apply
    self.report = report
  }

/**
   Asked for a location, and asked whether a failure deserves one. Both are the
   consumer's, and either may be unset: without a resolver there is nothing to
   ask, and without a predicate the policy below decides.

   Plain asynchronous closures rather than the view's own callbacks: what
   crosses the bridge, and how an answer is awaited, is the view's business.
   */
  var resolveLocation: ((_ identity: String) async -> String?)?
  var shouldRefresh: ((_ failure: SourceRequestFailure) async -> Bool)?

  /// Relocations allowed without a read succeeding in between, and how long a
  /// failed read waits for an answer. Mirrors `MAX_CONSECUTIVE_RELOCATIONS` and
  /// `SOURCE_RECOVERY_TIMEOUT_MS` in `web/utils/relocationGuard.ts`, and
  /// `maxConsecutiveRelocations`/`timeoutMs` in `SourceRecovery.kt`. Keep the
  /// three in step.
  private static let maxConsecutiveRelocations = 2
  private static let timeout: TimeInterval = 10

  /// Guards the two counters below, which a read on any thread may touch. A
  /// plain lock rather than the actor, so a successful read costs nothing —
  /// reads succeed constantly, and failures are the rare case.
  private let lock = NSLock()
  /**
   Relocations since a read last succeeded. A read that succeeds restores the
   budget: a location is worth replacing however often it expires, but
   replacing it repeatedly without a read ever succeeding is a loop rather than
   an expiry.
   */
  private var consecutiveRelocations = 0
  /// The location a decline was last reported for. See ``report``.
  private var declinedFor: String?

  /// Serializes answers, because an expiring credential fails every read in
  /// flight and each would otherwise ask for its own location.
  private let coordinator = RecoveryCoordinator()

  /// A read succeeded, so the location is answering and the budget is whole.
  func noteReadSucceeded() {
    lock.lock()
    defer { lock.unlock() }
    consecutiveRelocations = 0
    declinedFor = nil
  }

  /**
   Answers a failed read. Returns whether a location the read can be retried
   against is now in use.
   */
  func answer(observed: String, error: ReadError) async -> Bool {
    let status = Self.statusOf(error)
    // A status that was read is an HTTP answer; without one there is nothing
    // to tell a refusal from a connection that failed.
    let failure = SourceRequestFailure(
      url: observed,
      status: status,
      kind: status == nil ? .unreadable : .http,
      detail: error.localizedDescription
    )

    // The deadline covers the whole attempt, including waiting on one another
    // read started, because `Promise.await` cannot be cancelled: a consumer
    // whose promise never settles would otherwise hold this read — and every
    // read riding the same attempt — for as long as the publication is open.
    // The attempt may therefore outlive everyone waiting on it, which is
    // harmless: a late answer moves the location, and the next read finds it.
    let moved = await withDeadline(Self.timeout) {
      await self.coordinator.answer(
        observed: observed,
        currentLocation: self.currentLocation,
        relocate: { [weak self] in
          // Nothing to ask: the consumer is not using `resolveSource`, so this
          // failure is theirs to see however it would have surfaced anyway.
          guard let self, let resolve = self.resolveLocation else { return false }

          guard self.canRelocate() else {
            self.decline(failure)
            return false
          }

          let refresh = await self.shouldRefresh?(failure)
            ?? Self.looksRefreshable(status)
          guard refresh else {
            self.decline(failure)
            return false
          }

          // An empty answer is the consumer declining, and the answer may not
          // be a url at all, which the view says by refusing it.
          let next = await resolve(self.identity() ?? observed)
          guard let next, !next.isEmpty, self.apply(next) else {
            self.decline(failure)
            return false
          }

          self.noteRelocation()
          return true
        }
      )
    }

    // Nothing came back in time. JS may yet answer, but this read cannot wait
    // on it, so the failure stands and is ours to report.
    guard let moved else {
      decline(failure)
      return false
    }

    return moved
  }

  private func canRelocate() -> Bool {
    lock.lock()
    defer { lock.unlock() }
    return consecutiveRelocations < Self.maxConsecutiveRelocations
  }

  private func noteRelocation() {
    lock.lock()
    defer { lock.unlock() }
    consecutiveRelocations += 1
  }

  /**
   Reports a read given up on, once per location until a read succeeds: an
   expiring credential fails every read in flight, and the consumer wants to
   hear that a page is missing, not hear it thirty times.
   */
  private func decline(_ failure: SourceRequestFailure) {
    lock.lock()
    if declinedFor == failure.url {
      lock.unlock()
      return
    }
    declinedFor = failure.url
    lock.unlock()

    report(failure)
  }

  /**
   Whether a failed read is worth a new location, when the consumer has not
   said: a refused or expired credential is what a 401 or 403 means, and
   deciding it here means an ordinary expiry never round-trips to JS to be
   classified.
   */
  private static func looksRefreshable(_ status: Double?) -> Bool {
    status == 401 || status == 403
  }

  /// The status behind a read failure, where it was an HTTP response.
  private static func statusOf(_ error: ReadError) -> Double? {
    guard case let .access(.http(.errorResponse(response))) = error else {
      return nil
    }
    return Double(response.status.rawValue)
  }
}

/**
 Races `body` against a deadline. Nil means the deadline won, or that `body`
 had no answer — both mean the same thing here.

 Nothing is cancelled, and that is the point: `body` awaits a JS promise
 through `Promise.await`, which suspends on an unsafe continuation and so
 cannot be cancelled at all. A task group would be no use here, because it
 awaits its children before returning — the deadline would elapse and the
 caller would stay suspended anyway, waiting for the very work it gave up on.
 Both sides race to resume the caller instead, and whichever loses carries on
 unobserved.
 */
private func withDeadline<T: Sendable>(
  _ seconds: TimeInterval,
  _ body: @escaping () async -> T?
) async -> T? {
  let claim = DeadlineClaim()

  return await withCheckedContinuation { continuation in
    Task {
      let value = await body()
      if claim.take() { continuation.resume(returning: value) }
    }

    Task {
      try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
      if claim.take() { continuation.resume(returning: nil) }
    }
  }
}

/// Lets exactly one of two racing tasks resume a continuation. Resuming one
/// twice is a crash, not a mistake Swift will forgive.
private final class DeadlineClaim: @unchecked Sendable {
  private let lock = NSLock()
  private var taken = false

  func take() -> Bool {
    // `withLock` is iOS 16; this pod supports 15.1.
    lock.lock()
    defer { lock.unlock() }

    if taken { return false }
    taken = true
    return true
  }
}

/**
 Serializes answers to failed reads: one at a time, because an expiring
 credential fails every read in flight and each would otherwise ask for its own
 location.

 The budget those answers spend lives in ``SourceRecovery``, behind a plain
 lock, so that a successful read does not have to hop onto this actor to
 restore it.
 */
actor RecoveryCoordinator {
  private var inFlight: Task<Bool, Never>?

  /// - Parameters:
  ///   - observed: The location the failed read was made against.
  ///   - currentLocation: The location in use now, read when this is decided.
  ///   - relocate: Puts a new location in use; false when it could not. Also
  ///     where the budget is spent, so that a refusal is reported by the one
  ///     place that knows why.
  func answer(
    observed: String,
    currentLocation: () -> String?,
    relocate: @escaping () async -> Bool
  ) async -> Bool {
    // Already answering: retry against whatever that settles on.
    if let inFlight { return await inFlight.value }

    // Another failed read already moved the location, so this one only needs
    // trying again.
    if let current = currentLocation(), current != observed { return true }

    let task = Task { await relocate() }
    inFlight = task
    let moved = await task.value
    inFlight = nil
    return moved
  }
}

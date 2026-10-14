import type { SourceRequestFailure } from '../../src/components/ReadiumView.types';

/** Relocations allowed without a request succeeding in between. */
export const MAX_CONSECUTIVE_RELOCATIONS = 2;

/**
 * How long a failed request waits for the consumer to answer it.
 *
 * Answering a failure means asking the consumer two questions, and a consumer
 * that never replies — a request of its own with no timeout, made while the
 * network is gone — would otherwise hold every later failure behind it
 * forever, since only one failure is answered at a time. Past this the failure
 * simply stands.
 *
 * Mirrored natively by `timeoutMs` in `SourceRecovery.kt` and `timeout` in
 * `SourceRecovery.swift`. Keep the three in step.
 */
export const SOURCE_RECOVERY_TIMEOUT_MS = 10_000;

/**
 * Resolves with `onTimeout()` if `promise` has not settled within `ms`. A
 * rejection still rejects; only silence is converted.
 */
const withDeadline = <T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => T
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => resolve(onTimeout()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

/**
 * A credential that expired or was refused. `unreadable` covers a host that
 * omits CORS headers from errors, which withholds the status.
 */
export const looksRefreshable = (failure: SourceRequestFailure): boolean =>
  failure.kind === 'unreadable' ||
  failure.status === 401 ||
  failure.status === 403;

export interface RelocationRequest {
  /** What failed. */
  failure: SourceRequestFailure;
  /** The location in use when the failed request was started. */
  observedSource: string;
  /** The location in use now. */
  currentSource: string | null;
  /** Whether this failure is worth a new location. */
  shouldRefresh: (failure: SourceRequestFailure) => boolean | Promise<boolean>;
  /** Puts a new location in use; false when it could not. Reports its own errors. */
  relocate: () => Promise<boolean>;
  /** The failure is not being answered with a new location. */
  report: (failure: SourceRequestFailure) => void;
}

export interface RelocationGuard {
  /** A request succeeded, so the consecutive-relocation budget is whole. */
  noteSuccess(): void;
  /** Relocations since a request last succeeded. */
  consecutive(): number;
  /** Whether a location is now in use that the failed request can be retried against. */
  answer(request: RelocationRequest): Promise<boolean>;
}

/**
 * Decides when a failed request earns a new location: one relocation at a
 * time, stale failures ignored, and a limit on consecutive attempts.
 *
 * Deals in yes/no rather than urls, so a caller cannot mistake a location for
 * the directory it fetches from.
 */
export const createRelocationGuard = ({
  maxConsecutive = MAX_CONSECUTIVE_RELOCATIONS,
  timeoutMs = SOURCE_RECOVERY_TIMEOUT_MS,
} = {}): RelocationGuard => {
  let inFlight: Promise<boolean> | null = null;
  let consecutive = 0;

  return {
    noteSuccess() {
      consecutive = 0;
    },

    consecutive() {
      return consecutive;
    },

    answer({
      failure,
      observedSource,
      currentSource,
      shouldRefresh,
      relocate,
      report,
    }) {
      // Already relocating: retry against whatever it settles on.
      if (inFlight) return inFlight;

      // Already replaced by something else, so this failure is answered.
      if (observedSource !== currentSource) return Promise.resolve(true);

      if (consecutive >= maxConsecutive) {
        report(failure);
        return Promise.resolve(false);
      }

      // Claimed synchronously: a burst arrives in one tick, so awaiting the
      // decision first would let every failure past the check above.
      const answering = (async () => {
        // A predicate that throws is not a yes. Letting it reject would reject
        // the publication's own request with the consumer's error, losing the
        // failure that actually happened and taking every coalesced caller
        // with it.
        let refresh = false;
        try {
          refresh = await shouldRefresh(failure);
        } catch {
          refresh = false;
        }

        if (!refresh) {
          report(failure);
          return false;
        }

        consecutive += 1;

        try {
          return await relocate();
        } catch {
          // A relocation that threw is not a relocation. Reported like any
          // other failure the library gave up on: letting it reject would
          // take the request that is waiting on this with it, and leave
          // whoever is not waiting with an unhandled rejection.
          report(failure);
          return false;
        }
      })();

      // The slot belongs to the attempt, and is given up when the attempt
      // settles — not when the deadline below gives up waiting for it, which
      // would let a second relocation start behind a slow first one.
      //
      // Nothing cancels an abandoned attempt: a consumer that answers after
      // the deadline still moves the location, which is harmless — a fresher
      // location is no worse than the one in use. What is prevented is two
      // of them in flight at once.
      answering.finally(() => {
        inFlight = null;
      });

      // The deadline frees the *caller*: a failure that cannot be answered in
      // reasonable time stands, and so does every later one while the attempt
      // it is riding on remains unsettled.
      const running = withDeadline(answering, timeoutMs, () => {
        report(failure);
        return false;
      });

      inFlight = running;
      return running;
    },
  };
};

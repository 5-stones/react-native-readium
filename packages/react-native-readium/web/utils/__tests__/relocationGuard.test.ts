import {
  createRelocationGuard,
  looksRefreshable,
  MAX_CONSECUTIVE_RELOCATIONS,
  SOURCE_RECOVERY_TIMEOUT_MS,
} from '../relocationGuard';
import type { SourceRequestFailure } from '../../../src/components/ReadiumView.types';

const OLD = 'https://cdn.test/token-a/manifest.json';
const NEW = 'https://cdn.test/token-b/manifest.json';

const unreadable: SourceRequestFailure = {
  url: `${OLD}/../chapter-1.xhtml`,
  kind: 'unreadable',
};

/** A request whose location is current and which relocates successfully. */
const request = (
  overrides: Partial<
    Parameters<ReturnType<typeof createRelocationGuard>['answer']>[0]
  > = {}
) => ({
  failure: unreadable,
  observedSource: OLD,
  currentSource: OLD,
  shouldRefresh: () => true,
  relocate: jest.fn(async () => true),
  report: jest.fn(),
  ...overrides,
});

describe('looksRefreshable', () => {
  it.each([
    [{ url: 'u', kind: 'unreadable' } as SourceRequestFailure],
    [{ url: 'u', kind: 'http', status: 401 } as SourceRequestFailure],
    [{ url: 'u', kind: 'http', status: 403 } as SourceRequestFailure],
  ])('claims %j', (failure) => {
    expect(looksRefreshable(failure)).toBe(true);
  });

  it.each([
    [{ url: 'u', kind: 'http', status: 404 } as SourceRequestFailure],
    [{ url: 'u', kind: 'http', status: 500 } as SourceRequestFailure],
    [{ url: 'u', kind: 'http', status: 200 } as SourceRequestFailure],
  ])('does not claim %j', (failure) => {
    expect(looksRefreshable(failure)).toBe(false);
  });
});

describe('createRelocationGuard', () => {
  it('relocates and reports the location to retry against', async () => {
    const guard = createRelocationGuard();
    const req = request();

    await expect(guard.answer(req)).resolves.toBe(true);
    expect(req.relocate).toHaveBeenCalledTimes(1);
    expect(req.report).not.toHaveBeenCalled();
  });

  it('reports instead when the failure is not worth a new location', async () => {
    const guard = createRelocationGuard();
    const req = request({ shouldRefresh: () => false });

    await expect(guard.answer(req)).resolves.toBe(false);
    expect(req.relocate).not.toHaveBeenCalled();
    expect(req.report).toHaveBeenCalledWith(unreadable);
  });

  it('awaits an async decision', async () => {
    const guard = createRelocationGuard();
    const req = request({ shouldRefresh: async () => false });

    await expect(guard.answer(req)).resolves.toBe(false);
    expect(req.relocate).not.toHaveBeenCalled();
  });

  /**
   * A credential expiring fails every request in flight, not one. Each would
   * otherwise ask for its own location, and the reader would be relocated as
   * many times as it had chapters prefetched.
   */
  describe('when a burst of failures arrives', () => {
    it('relocates once and gives every caller the same location', async () => {
      const guard = createRelocationGuard();
      let release: (moved: boolean) => void = () => {};
      const relocate = jest.fn(
        () => new Promise<boolean>((resolve) => (release = resolve))
      );
      const req = request({ relocate });

      const all = Promise.all([
        guard.answer(req),
        guard.answer(req),
        guard.answer(req),
      ]);

      // Deciding whether to relocate is awaited, so `relocate` is reached a
      // microtask later. Waiting for it beats guessing at a delay.
      while (relocate.mock.calls.length === 0) await Promise.resolve();
      release(true);

      expect(await all).toEqual([true, true, true]);
      expect(relocate).toHaveBeenCalledTimes(1);
      expect(guard.consecutive()).toBe(1);
    });

    it('relocates again for a later failure, once the first has settled', async () => {
      const guard = createRelocationGuard();
      const first = request();
      await guard.answer(first);

      const second = request({ observedSource: NEW, currentSource: NEW });
      await guard.answer(second);

      expect(second.relocate).toHaveBeenCalledTimes(1);
    });
  });

  it('treats a throwing decision as a no, reporting the real failure', async () => {
    const guard = createRelocationGuard();
    const req = request({
      shouldRefresh: () => {
        throw new Error('token state not loaded');
      },
    });

    // Rejecting here would reject the publication's own request with this
    // error, hiding the failure that actually happened.
    await expect(guard.answer(req)).resolves.toBe(false);
    expect(req.relocate).not.toHaveBeenCalled();
    expect(req.report).toHaveBeenCalledWith(unreadable);
  });

  it('treats a failure from a replaced location as already answered', async () => {
    const guard = createRelocationGuard();
    // Observed under the old location, but something has since moved on.
    const req = request({ observedSource: OLD, currentSource: NEW });

    // Something else already moved on, so this is answered without asking.
    await expect(guard.answer(req)).resolves.toBe(true);
    expect(req.relocate).not.toHaveBeenCalled();
    expect(req.report).not.toHaveBeenCalled();
  });

  describe('when a new location keeps failing', () => {
    it('stops after the limit and reports', async () => {
      const guard = createRelocationGuard({ maxConsecutive: 2 });

      await guard.answer(request());
      await guard.answer(request({ observedSource: NEW, currentSource: NEW }));
      expect(guard.consecutive()).toBe(2);

      const exhausted = request({
        observedSource: NEW,
        currentSource: NEW,
      });
      await expect(guard.answer(exhausted)).resolves.toBe(false);
      expect(exhausted.relocate).not.toHaveBeenCalled();
      expect(exhausted.report).toHaveBeenCalledWith(unreadable);
    });

    it('is whole again once a request succeeds', async () => {
      const guard = createRelocationGuard({ maxConsecutive: 1 });

      await guard.answer(request());
      expect(guard.consecutive()).toBe(1);

      guard.noteSuccess();
      expect(guard.consecutive()).toBe(0);

      const later = request({ observedSource: NEW, currentSource: NEW });
      await expect(guard.answer(later)).resolves.toBe(true);
    });
  });

  /**
   * A consumer's `resolveSource` may well throw — a request of its own that
   * failed, or a status it refuses. That is a failure to relocate, not an
   * error to propagate into the request that was waiting on it.
   */
  it('reports a relocation that threw, rather than rejecting', async () => {
    const guard = createRelocationGuard();
    const throwing = request({
      relocate: jest.fn(async () => {
        throw new Error('resolveSource said no');
      }),
    });

    await expect(guard.answer(throwing)).resolves.toBe(false);
    expect(throwing.report).toHaveBeenCalledWith(unreadable);

    // And the slot is free: the next failure gets its own attempt.
    const later = request();
    await expect(guard.answer(later)).resolves.toBe(true);
  });

  it('releases the in-flight hold when a relocation fails', async () => {
    const guard = createRelocationGuard();
    const failing = request({ relocate: jest.fn(async () => false) });

    await expect(guard.answer(failing)).resolves.toBe(false);

    // The hold must not have latched: a later failure gets its own attempt.
    const later = request();
    await expect(guard.answer(later)).resolves.toBe(true);
    expect(later.relocate).toHaveBeenCalledTimes(1);
  });

  /**
   * Only one failure is answered at a time, so a consumer that never answers
   * would hold every later failure behind it for as long as the reader is
   * open.
   */
  describe('when the consumer never answers', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('gives up on the failure rather than waiting', async () => {
      const guard = createRelocationGuard({ timeoutMs: 50 });
      const silent = request({
        shouldRefresh: () => new Promise<boolean>(() => {}),
      });

      const answer = guard.answer(silent);
      jest.advanceTimersByTime(50);

      await expect(answer).resolves.toBe(false);
      expect(silent.report).toHaveBeenCalledWith(unreadable);
      expect(silent.relocate).not.toHaveBeenCalled();
    });

    /**
     * Giving up on waiting is not giving up the slot: a second relocation
     * must not run behind the first, and the abandoned one must not move the
     * location when it finally answers.
     */
    it('does not start a second relocation behind an abandoned one', async () => {
      const guard = createRelocationGuard({ timeoutMs: 50 });
      const silent = request({
        shouldRefresh: () => new Promise<boolean>(() => {}),
      });

      const answer = guard.answer(silent);
      jest.advanceTimersByTime(50);
      await expect(answer).resolves.toBe(false);

      const later = request();
      await expect(guard.answer(later)).resolves.toBe(false);
      expect(later.relocate).not.toHaveBeenCalled();
    });

    it('takes the slot back once the abandoned attempt settles', async () => {
      const guard = createRelocationGuard({ timeoutMs: 50 });
      let answerSlowly: (refresh: boolean) => void = () => {};
      const slow = request({
        shouldRefresh: () =>
          new Promise<boolean>((resolve) => {
            answerSlowly = resolve;
          }),
      });

      const answer = guard.answer(slow);
      jest.advanceTimersByTime(50);
      await expect(answer).resolves.toBe(false);

      // It comes back, too late to be of use, and says no.
      answerSlowly(false);
      await Promise.resolve();
      await Promise.resolve();

      const later = request();
      await expect(guard.answer(later)).resolves.toBe(true);
      expect(later.relocate).toHaveBeenCalledTimes(1);
    });

    it('gives up on a relocation that never finishes', async () => {
      const guard = createRelocationGuard({ timeoutMs: 50 });
      const stuck = request({
        relocate: jest.fn(() => new Promise<boolean>(() => {})),
      });

      const answer = guard.answer(stuck);
      jest.advanceTimersByTime(50);

      await expect(answer).resolves.toBe(false);
      expect(stuck.report).toHaveBeenCalledWith(unreadable);
    });
  });

  it('defaults to two relocations and a ten second answer', () => {
    expect(MAX_CONSECUTIVE_RELOCATIONS).toBe(2);
    expect(SOURCE_RECOVERY_TIMEOUT_MS).toBe(10_000);
  });
});

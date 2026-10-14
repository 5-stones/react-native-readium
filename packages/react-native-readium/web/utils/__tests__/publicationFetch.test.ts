import {
  createPublicationFetch,
  failureFromError,
  SOURCE_REQUEST_TIMEOUT_MS,
} from '../publicationFetch';
import type { PublicationFetchDeps } from '../publicationFetch';

const OLD_BASE = 'https://cdn.test/token-a/book/';
const NEW_BASE = 'https://cdn.test/token-b/book/';
const CHAPTER = `${OLD_BASE}epub/text/chapter-1.xhtml`;

const ok = (url = CHAPTER) => ({ ok: true, status: 200, url } as Response);
const forbidden = () => ({ ok: false, status: 403, url: CHAPTER } as Response);

/** A fetch that answers from a queue, recording what it was asked for. */
const fetchQueue = (...answers: Array<Response | Error>) => {
  const calls: string[] = [];
  const fn = jest.fn(async (input: any) => {
    calls.push(String(input));
    const answer = answers.shift();
    if (answer instanceof Error) throw answer;
    if (!answer) throw new Error(`no queued answer for ${input}`);
    return answer;
  });
  return { fn, calls };
};

const deps = (overrides: Partial<PublicationFetchDeps> = {}) => {
  let base = OLD_BASE;
  return {
    source: () => `${OLD_BASE}manifest.json`,
    base: () => base,
    /** Relocates by default, moving the base as a real relocation would. */
    relocated: jest.fn(async () => {
      base = NEW_BASE;
      return true;
    }),
    onSuccess: jest.fn(),
    onUnanswered: jest.fn(),
    ...overrides,
  } as PublicationFetchDeps & {
    relocated: jest.Mock;
    onSuccess: jest.Mock;
    onUnanswered: jest.Mock;
  };
};

describe('createPublicationFetch', () => {
  it('passes a successful response straight through', async () => {
    const { fn } = fetchQueue(ok());
    const d = deps();
    const fetch = createPublicationFetch({ ...d, fetch: fn });

    await expect(fetch(CHAPTER)).resolves.toMatchObject({ ok: true });
    expect(d.relocated).not.toHaveBeenCalled();
    expect(d.onSuccess).toHaveBeenCalled();
  });

  /**
   * The retry has to be rebuilt from the *directory* that moved. Handing back
   * a location — the manifest url, say — and concatenating it produces
   * `…/manifest.jsonepub/text/chapter-1.xhtml`, which 404s while a perfectly
   * good location is in use.
   */
  it('retries under the new directory, preserving the path within it', async () => {
    const { fn, calls } = fetchQueue(forbidden(), ok(`${NEW_BASE}x`));
    const d = deps();
    const fetch = createPublicationFetch({ ...d, fetch: fn });

    await expect(fetch(CHAPTER)).resolves.toMatchObject({ ok: true });
    expect(calls).toEqual([CHAPTER, `${NEW_BASE}epub/text/chapter-1.xhtml`]);
  });

  it('retries a request that threw, not just one that answered', async () => {
    const { fn, calls } = fetchQueue(
      new TypeError('Failed to fetch'),
      ok(`${NEW_BASE}x`)
    );
    const d = deps();
    const fetch = createPublicationFetch({ ...d, fetch: fn });

    await expect(fetch(CHAPTER)).resolves.toMatchObject({ ok: true });
    expect(calls).toHaveLength(2);
    // A thrown request carries no readable status.
    expect(d.relocated).toHaveBeenCalledWith(
      { url: CHAPTER, kind: 'unreadable' },
      `${OLD_BASE}manifest.json`
    );
  });

  it('reports the status when one was readable', async () => {
    const { fn } = fetchQueue(forbidden(), ok(`${NEW_BASE}x`));
    const d = deps();
    await createPublicationFetch({ ...d, fetch: fn })(CHAPTER);

    expect(d.relocated).toHaveBeenCalledWith(
      { url: CHAPTER, status: 403, kind: 'http' },
      `${OLD_BASE}manifest.json`
    );
  });

  describe('when there is nothing to retry against', () => {
    it('returns the failing response as it was', async () => {
      const { fn, calls } = fetchQueue(forbidden());
      const d = deps({ relocated: jest.fn(async () => false) });
      const fetch = createPublicationFetch({ ...d, fetch: fn });

      await expect(fetch(CHAPTER)).resolves.toMatchObject({
        ok: false,
        status: 403,
      });
      expect(calls).toHaveLength(1);
      expect(d.onUnanswered).toHaveBeenCalled();
    });

    it('rethrows the original error, not one of its own', async () => {
      const original = new TypeError('Failed to fetch');
      const { fn } = fetchQueue(original);
      const d = deps({ relocated: jest.fn(async () => false) });
      const fetch = createPublicationFetch({ ...d, fetch: fn });

      await expect(fetch(CHAPTER)).rejects.toBe(original);
      expect(d.onUnanswered).toHaveBeenCalled();
    });

    /** A relocation that resolved to the same place is not worth retrying. */
    it('does not retry when the directory did not actually move', async () => {
      const { fn, calls } = fetchQueue(forbidden());
      const d = deps({ relocated: jest.fn(async () => true) }); // base unchanged
      const fetch = createPublicationFetch({ ...d, fetch: fn });

      await expect(fetch(CHAPTER)).resolves.toMatchObject({ ok: false });
      expect(calls).toHaveLength(1);
    });

    it('leaves a url from outside the publication alone', async () => {
      const outside = 'https://elsewhere.test/thing.xhtml';
      const { fn, calls } = fetchQueue(forbidden());
      const d = deps();
      const fetch = createPublicationFetch({ ...d, fetch: fn });

      await expect(fetch(outside)).resolves.toMatchObject({ ok: false });
      expect(calls).toEqual([outside]);
    });
  });

  it('does not count a failed retry as a success', async () => {
    const { fn } = fetchQueue(forbidden(), forbidden());
    const d = deps();
    const fetch = createPublicationFetch({ ...d, fetch: fn });

    await expect(fetch(CHAPTER)).resolves.toMatchObject({ ok: false });
    expect(d.onSuccess).not.toHaveBeenCalled();
  });

  it('accepts a Request, not only a url string', async () => {
    const { fn } = fetchQueue(ok());
    const d = deps();
    const fetch = createPublicationFetch({ ...d, fetch: fn });

    await fetch({ url: CHAPTER } as Request);
    expect(d.onSuccess).toHaveBeenCalled();
  });
});

describe('failureFromError', () => {
  const URL_ = 'https://cdn.test/book.pdf';

  it("reads pdf.js's ResponseException status", () => {
    const error = Object.assign(new Error('Unexpected server response (403)'), {
      name: 'UnexpectedResponseException',
      status: 403,
    });

    expect(failureFromError(URL_, error)).toEqual({
      url: URL_,
      status: 403,
      kind: 'http',
    });
  });

  it.each([
    ['a plain error', new Error('boom')],
    [
      'a status of 0, which carries nothing',
      Object.assign(new Error('x'), { status: 0 }),
    ],
    ['a non-numeric status', Object.assign(new Error('x'), { status: 'nope' })],
    ['nothing at all', undefined],
  ])('reports %s as unreadable', (_label, error) => {
    expect(failureFromError(URL_, error)).toEqual({
      url: URL_,
      kind: 'unreadable',
    });
  });
});

/**
 * A host that accepts a connection and then stops answering would otherwise
 * leave the reader on a blank page indefinitely.
 */
describe('createPublicationFetch, bounding a request', () => {
  /** Records the `init` each call was made with. */
  const recordingFetch = (...answers: Response[]) => {
    const inits: Array<RequestInit | undefined> = [];
    const fn = jest.fn(async (_input: any, init?: RequestInit) => {
      inits.push(init);
      const answer = answers.shift();
      if (!answer) throw new Error('no queued answer');
      return answer;
    });
    return { fn, inits };
  };

  it('attaches a deadline to the request', async () => {
    const { fn, inits } = recordingFetch(ok());
    const d = deps();

    await createPublicationFetch({ ...d, fetch: fn as any })(CHAPTER);

    expect(inits[0]?.signal).toBeInstanceOf(AbortSignal);
    expect(inits[0]?.signal?.aborted).toBe(false);
  });

  /** Cancelling a request matters more than bounding it. */
  it("keeps the caller's own signal", async () => {
    const { fn, inits } = recordingFetch(ok());
    const d = deps();
    const caller = new AbortController();

    await createPublicationFetch({ ...d, fetch: fn as any })(CHAPTER, {
      signal: caller.signal,
    });

    const combined = inits[0]?.signal;
    expect(combined?.aborted).toBe(false);
    caller.abort();
    expect(combined?.aborted).toBe(true);
  });

  /** A spent timeout signal would abort the retry the moment it was made. */
  it('gives the retry a deadline of its own', async () => {
    const { fn, inits } = recordingFetch(forbidden(), ok());
    const d = deps();

    await createPublicationFetch({ ...d, fetch: fn as any })(CHAPTER);

    expect(inits).toHaveLength(2);
    expect(inits[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(inits[1]?.signal).not.toBe(inits[0]?.signal);
  });

  it('bounds a request at thirty seconds', () => {
    expect(SOURCE_REQUEST_TIMEOUT_MS).toBe(30_000);
  });

  /**
   * A host that accepts the connection and goes quiet is not a location that
   * stopped working. Relocating would spend a token refresh and another whole
   * timeout to fail in exactly the same way.
   */
  it('reports its own timeout rather than relocating', async () => {
    const d = deps();
    const report = jest.fn();
    const fetch = createPublicationFetch({
      ...d,
      report,
      timeoutMs: 10,
      // Never answers, so only the deadline can end this.
      fetch: ((_input: any, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(
              Object.assign(new Error('The operation was aborted.'), {
                name: 'TimeoutError',
              })
            )
          );
        })) as any,
    });

    await expect(fetch(CHAPTER)).rejects.toThrow();

    expect(d.relocated).not.toHaveBeenCalled();
    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({ url: CHAPTER, kind: 'unreadable' })
    );
    expect(d.onUnanswered).toHaveBeenCalled();
  });

  /** Whoever cancelled the request knows; the publication may be going away. */
  it("says nothing about a caller's own abort", async () => {
    const d = deps();
    const report = jest.fn();
    const caller = new AbortController();
    const fetch = createPublicationFetch({
      ...d,
      report,
      fetch: ((_input: any, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
          );
        })) as any,
    });

    const pending = fetch(CHAPTER, { signal: caller.signal });
    caller.abort();

    await expect(pending).rejects.toThrow('aborted');
    expect(d.relocated).not.toHaveBeenCalled();
    expect(report).not.toHaveBeenCalled();
  });
});

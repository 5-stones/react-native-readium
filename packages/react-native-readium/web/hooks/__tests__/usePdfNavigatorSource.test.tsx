/**
 * The location a PDF is read from, as `resolveSource` supplies it.
 *
 * Only the source plumbing is exercised: the hook is given a url neither
 * navigator claims as a PDF, so pdf.js is never reached and no canvas,
 * document or worker is involved.
 */
// Not resolvable from this package; nothing here reaches it.
jest.mock('@readium/shared', () => ({ Locator: class {} }), { virtual: true });
jest.mock('@readium/navigator', () => ({}), { virtual: true });

// Rejects before the load touches the DOM, so a failure is reachable without
// jsdom, a canvas or a worker.
jest.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  version: '0.0.0',
  getDocument: jest.fn(() => ({
    promise: Promise.reject(
      Object.assign(new Error('Unexpected server response (403)'), {
        name: 'UnexpectedResponseException',
        status: 403,
      })
    ),
    destroy: async () => {},
  })),
}));

jest.mock('../../utils/capabilities', () => ({
  assessCapabilities: () => ({}),
  pdfCapabilities: {},
}));

import { usePdfNavigator } from '../usePdfNavigator';
import { renderHook } from '../../test-utils/renderHook';
import type { PublicationSource } from '../../../src/components/ReadiumView.types';

const BOOK_A = '/a.pdf';

type Props = {
  url: string;
  resolveSource: (r: {
    url: string;
    reason: string;
  }) => Promise<PublicationSource>;
};

const render = (props: Props) =>
  renderHook(
    (p: Props) =>
      usePdfNavigator({
        file: { url: p.url },
        resolveSource: p.resolveSource as any,
        preferences: {},
        container: null,
        onPublicationError: () => {},
      }),
    props
  );

/**
 * Stable across renders. A fresh object each time re-runs the load effect,
 * whose cleanup cancels the in-flight import before it reaches pdf.js.
 */
const CONTAINER = { innerHTML: '', appendChild: () => {} } as any;

const renderWithContainer = (props: Props) =>
  renderHook(
    (p: Props) =>
      usePdfNavigator({
        file: { url: p.url },
        resolveSource: p.resolveSource as any,
        preferences: {},
        // Enough to get past the guard; the load rejects before the DOM is
        // touched.
        container: CONTAINER,
        onPublicationError: () => {},
      }),
    props
  );

describe('usePdfNavigator source resolution', () => {
  it('asks for a location for the file it was given', async () => {
    const resolveSource = jest.fn(async ({ url }) => ({
      url: `${url}?signed=a`,
    }));

    const h = render({ url: BOOK_A, resolveSource });
    await h.settle();

    expect(resolveSource).toHaveBeenCalledWith({
      url: BOOK_A,
      reason: 'open',
    });
  });

  /**
   * Not covered: that the previous book stops being used when the identity
   * changes. The fix clears the location, but the symptom — its document
   * staying painted and interactive — is only observable with a real DOM,
   * which this package has no test environment for.
   */
});

describe('usePdfNavigator failure handling', () => {
  /**
   * Observes the defect: a load that fails because the location expired is
   * never answered by asking for a new one, so the reader is stuck with a
   * document that cannot be read.
   */
  it('asks for a new location when the document fails to load', async () => {
    const resolveSource = jest.fn(async ({ url }) => ({ url: `${url}?a` }));
    const h = renderWithContainer({
      url: BOOK_A,
      resolveSource: resolveSource as any,
    });
    await h.settle();

    const reasons = resolveSource.mock.calls.map(([r]: any[]) => r.reason);
    expect(reasons).toContain('refresh');
  });

  /** The identity is what a location is asked for, every time. */
  it('asks about the file it was given, not the location that failed', async () => {
    const resolveSource = jest.fn(async ({ url }) => ({ url: `${url}?a` }));
    const h = renderWithContainer({
      url: BOOK_A,
      resolveSource: resolveSource as any,
    });
    await h.settle();

    for (const [request] of resolveSource.mock.calls as any[][]) {
      expect(request.url).toBe(BOOK_A);
    }
  });

  it('leaves the failure alone when the consumer says it is not worth a location', async () => {
    const resolveSource = jest.fn(async ({ url }) => ({ url: `${url}?a` }));
    const shouldRefreshSource = jest.fn(async () => false);

    const h = renderHook(
      (p: Props) =>
        usePdfNavigator({
          file: { url: p.url },
          resolveSource: p.resolveSource as any,
          shouldRefreshSource: shouldRefreshSource as any,
          preferences: {},
          container: CONTAINER,
          onPublicationError: () => {},
        }),
      { url: BOOK_A, resolveSource: resolveSource as any }
    );
    await h.settle();

    expect(shouldRefreshSource).toHaveBeenCalled();
    const reasons = resolveSource.mock.calls.map(([r]: any[]) => r.reason);
    expect(reasons).not.toContain('refresh');
  });

  /**
   * A declined failure is reported with the stage it happened in. Here the
   * first load never succeeded, so it is an open failure — the read-stage
   * case needs a load that can succeed, which needs a real DOM this package
   * has no environment for. `SourceRecoveryTest.kt` covers it natively.
   */
  it('reports a declined failure with the stage it happened in', async () => {
    const onPublicationError = jest.fn();

    const h = renderHook(
      (p: Props) =>
        usePdfNavigator({
          file: { url: p.url },
          resolveSource: p.resolveSource as any,
          shouldRefreshSource: (async () => false) as any,
          preferences: {},
          container: CONTAINER,
          onPublicationError,
        }),
      {
        url: BOOK_A,
        resolveSource: (async ({ url }: any) => ({ url })) as any,
      }
    );
    await h.settle();

    const [event] = onPublicationError.mock.calls[0] as any[];
    expect(event.stage).toBe('open');
    expect(event.code).toBe('openFailed');
    expect(event.message).toBe("The publication couldn't be opened.");
  });
});

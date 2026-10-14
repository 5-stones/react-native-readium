import {
  toPublicationErrorEvent,
  toReadFailureEvent,
} from '../publicationError';

/**
 * The platforms report everything about a failure except how to say it: these
 * add `message` from `code`, so the wording is the same whether the failure
 * crossed the bridge or came from a web navigator that never touches it.
 */
describe('toPublicationErrorEvent', () => {
  it('describes the code and keeps the platform text as detail', () => {
    const event = toPublicationErrorEvent({
      url: 'file:///book.epub',
      code: 'fileNotFound',
      stage: 'open',
      detail: 'File does not exist: /book.epub',
    });

    expect(event).toEqual({
      url: 'file:///book.epub',
      code: 'fileNotFound',
      stage: 'open',
      message: "The publication file couldn't be found.",
      detail: 'File does not exist: /book.epub',
    });
  });

  it('reports no detail rather than an empty one', () => {
    const event = toPublicationErrorEvent({
      url: 'file:///book.epub',
      code: 'openFailed',
      stage: 'open',
      detail: '',
    });

    expect(event.detail).toBeUndefined();
    expect(event.message).toBe("The publication couldn't be opened.");
  });

  it('carries a protection scheme through', () => {
    const event = toPublicationErrorEvent({
      url: 'file:///book.epub',
      code: 'protectionNotSupported',
      stage: 'open',
      detail: 'LCP',
      protectionScheme: 'http://readium.org/2014/01/lcp',
    });

    expect(event.protectionScheme).toBe('http://readium.org/2014/01/lcp');
    expect(event.stage).toBe('open');
  });

  /**
   * The platform says how bad a failure is, because it is the only one that
   * knows: `stage` and `kind` are fields of the shared event, so Kotlin and
   * Swift carry them as enums and nothing here has to infer them.
   */
  it('keeps the stage, status and kind it was given', () => {
    const event = toPublicationErrorEvent({
      url: 'https://cdn.test/token/chapter-2.xhtml',
      code: 'readFailed',
      stage: 'read',
      detail: 'HTTP error 403',
      status: 403,
      kind: 'http',
    });

    expect(event).toEqual({
      url: 'https://cdn.test/token/chapter-2.xhtml',
      code: 'readFailed',
      stage: 'read',
      status: 403,
      kind: 'http',
      message: "Part of this publication couldn't be loaded.",
      detail: 'HTTP error 403',
    });
  });

  it('carries a failure whose status could not be read', () => {
    const event = toPublicationErrorEvent({
      url: 'https://cdn.test/token/chapter-2.xhtml',
      code: 'readFailed',
      stage: 'read',
      detail: 'Connection lost',
      kind: 'unreadable',
    });

    expect(event.kind).toBe('unreadable');
    expect(event.status).toBeUndefined();
  });
});

describe('toReadFailureEvent', () => {
  /**
   * The distinction the consumer acts on: a read failure leaves the
   * publication open, so it must not arrive looking like a failure to open.
   */
  it('reports the read stage, not an open failure', () => {
    const event = toReadFailureEvent(
      {
        url: 'https://cdn.test/token/chapter-2.xhtml',
        status: 403,
        kind: 'http',
      },
      'Could not read chapter-2.xhtml (status 403).'
    );

    expect(event).toEqual({
      url: 'https://cdn.test/token/chapter-2.xhtml',
      code: 'readFailed',
      stage: 'read',
      status: 403,
      kind: 'http',
      message: "Part of this publication couldn't be loaded.",
      detail: 'Could not read chapter-2.xhtml (status 403).',
    });
  });

  it('leaves the status out when the failure had none to give', () => {
    const event = toReadFailureEvent({
      url: 'https://cdn.test/token/chapter-2.xhtml',
      kind: 'unreadable',
    });

    expect(event.status).toBeUndefined();
    expect(event.kind).toBe('unreadable');
    expect(event.detail).toBeUndefined();
  });

  /** A consumer that shows `message` without branching must still be right. */
  it('describes itself without claiming the publication failed to open', () => {
    const { message } = toReadFailureEvent({ url: 'x', kind: 'unreadable' });

    expect(message).not.toMatch(/open/i);
  });
});

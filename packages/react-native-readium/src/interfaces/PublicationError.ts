import type { PublicationErrorCode } from '../specs';

/**
 * Something went wrong with a publication.
 *
 * The view's own event, declared in `src/specs/ReadiumView.nitro.ts` and
 * delivered as it is — `message` filled in from `code` on the way out. Branch
 * on `stage` before deciding how bad it is: an `'open'` failure means there is
 * nothing to read, while a `'read'` failure leaves the publication open and
 * the reader where they were.
 */
// The event is declared in `src/specs/errors.nitro.ts`, and documented there:
// a re-export carries no documentation of its own.
export type { PublicationErrorEvent } from '../specs';

/** The default English description of a `PublicationErrorCode`, as `message` reports it. */
export function describePublicationError(code: PublicationErrorCode): string {
  switch (code) {
    case 'fileNotFound':
      return "The publication file couldn't be found.";
    case 'formatNotSupported':
      return "This publication's format isn't supported.";
    case 'openFailed':
      return "The publication couldn't be opened.";
    case 'protectionNotSupported':
      return "This publication is protected with a DRM this app doesn't support.";
    case 'restricted':
      return 'Access to this publication was refused.';
    case 'cancelled':
      return 'Opening the publication was cancelled.';
    case 'readFailed':
      // Deliberately not phrased as a failure to open: a consumer that shows
      // this verbatim, without branching on `stage`, should still be telling
      // the truth.
      return "Part of this publication couldn't be loaded.";
  }
}

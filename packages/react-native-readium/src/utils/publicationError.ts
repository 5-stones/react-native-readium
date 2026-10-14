import {
  describePublicationError,
  type PublicationErrorEvent,
} from '../interfaces/PublicationError';
import type { SourceRequestFailure } from '../components/ReadiumView.types';

/** The event as a platform reports it: everything but the wording. */
type ReportedFailure = Omit<PublicationErrorEvent, 'message'>;

/**
 * Turns what the native view or the web navigators report, whose `message` is their own
 * description, into the public event: `message` from `code`, the platform's text in `detail`.
 *
 * `stage` and `kind` are derived here rather than reported, so the public
 * event has one definition — the same one for a failure that crossed the
 * bridge and for a web navigator's, which never does.
 */
export function toPublicationErrorEvent(
  report: ReportedFailure
): PublicationErrorEvent {
  return {
    ...report,
    message: describePublicationError(report.code),
    detail: report.detail || undefined,
  };
}

/**
 * The same, for a request the library made for an open publication's bytes and
 * gave up on.
 *
 * Reported through the same callback as an open failure, and told apart by
 * `stage`: the publication is still open, and the reader has not moved.
 *
 * @param failure What failed.
 * @param detail The platform's own description, for logs.
 */
export function toReadFailureEvent(
  failure: SourceRequestFailure,
  detail?: string
): PublicationErrorEvent {
  return toPublicationErrorEvent({
    url: failure.url,
    code: 'readFailed',
    stage: 'read',
    detail,
    status: failure.status,
    kind: failure.kind,
  });
}

import type { PublicationErrorEvent as NativePublicationErrorEvent } from '../specs/ReadiumView.nitro';
import {
  describePublicationError,
  type PublicationErrorEvent,
} from '../interfaces/PublicationError';

/**
 * Turns what the native view or the web navigators report, whose `message` is their own
 * description, into the public event: `message` from `code`, the platform's text in `detail`.
 */
export function toPublicationErrorEvent({
  message,
  ...report
}: NativePublicationErrorEvent): PublicationErrorEvent {
  return {
    ...report,
    message: describePublicationError(report.code),
    detail: message || undefined,
  };
}

import type {
  PublicationErrorCode,
  PublicationErrorEvent as NativePublicationErrorEvent,
} from '../specs/ReadiumView.nitro';

/**
 * The publication could not be opened. `url`, `code` and `protectionScheme` are as native reports
 * them; `message` and `detail` are described below.
 */
export interface PublicationErrorEvent
  extends Omit<NativePublicationErrorEvent, 'message'> {
  /** A default English description of `code`, the same on every platform. */
  message: string;
  /** The platform's own description of what went wrong, for logs. Varies by platform. */
  detail?: string;
}

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
  }
}

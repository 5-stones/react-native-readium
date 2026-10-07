import type { PublicationErrorCode } from '../specs/ReadiumView.nitro';

/** The publication could not be opened. */
export interface PublicationErrorEvent {
  /** The `file.url` whose open failed. */
  url: string;
  /** Why, the same on every platform: branch on it, or map it to your own localized text. */
  code: PublicationErrorCode;
  /** A default English description of `code`, the same on every platform. */
  message: string;
  /** The platform's own description of what went wrong, for logs. Varies by platform. */
  detail?: string;
  protectionScheme?: string;
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

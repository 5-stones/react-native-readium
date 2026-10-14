/**
 * What went wrong with a publication, in the terms every platform
 * reports it: a code, how bad it is, and what the platform itself said.
 */

/**
 * What went wrong with a publication.
 * - `protectionNotSupported`: protected with a scheme no registered content protection handles.
 * - `restricted`: a protection matched but refused access, e.g. an expired license.
 * - `cancelled`: restricted with no error, e.g. the passphrase prompt was dismissed.
 * - `readFailed`: a read of an *open* publication failed and was not recovered. The
 *   only code that does not mean the publication failed to open; see the event's `stage`.
 */
export type PublicationErrorCode =
  | 'fileNotFound'
  | 'formatNotSupported'
  | 'openFailed'
  | 'protectionNotSupported'
  | 'restricted'
  | 'cancelled'
  | 'readFailed';

/**
 * Whether a publication failed to open, or failed to be read after it was
 * open.
 *
 * `'read'` is not fatal: what the reader is looking at is intact, and one
 * request for the publication's bytes failed and was not recovered.
 */
export type PublicationErrorStage = 'open' | 'read';

/**
 * For a read failure, whether a status was readable at all. `'unreadable'`
 * covers a host that omits CORS headers from its errors, which withholds the
 * status from a web reader; native always has one.
 */
export type PublicationErrorKind = 'http' | 'unreadable';

/**
 * Something went wrong with a publication; `code` says what.
 *
 * Branch on `stage` before deciding how bad it is. `'open'` means the
 * publication could not be opened, and fires instead of a ready event.
 * `'read'` means it is open and intact, and one request for its bytes failed
 * and was not recovered — worth a retry, not worth tearing the reader down
 * for.
 *
 * Every field but `message` comes from the platform that reported the
 * failure; `message` is the wording that goes with `code`, filled in on the
 * way out so that it reads the same everywhere.
 */
export interface PublicationErrorEvent {
  /** The `file.url` the failure is about. */
  url: string;
  /** Why, the same on every platform: branch on it, or map it to your own localized text. */
  code: PublicationErrorCode;
  /**
   * How bad it is: whether there is a publication to read at all.
   *
   * Branch on this before deciding what to do. `'open'` fires instead of
   * `onPublicationReady`; `'read'` leaves the publication open and the reader
   * where they were, so it is worth a retry and not worth a teardown.
   */
  stage: PublicationErrorStage;
  /**
   * A default English description of `code`, the same on every platform.
   *
   * The one field here the platforms do not report: they pass an empty string
   * and JS fills it in from `code` on the way out, so that the wording lives
   * in one place rather than three. Always set by the time a consumer sees
   * the event.
   */
  message: string;
  /** The platform's own description of what went wrong, for logs. Varies by platform. */
  detail?: string;
  /** For a protected publication, its DRM scheme's URI. */
  protectionScheme?: string;
  /** For a read failure, the HTTP status where the failure was a response. */
  status?: number;
  /** For a read failure, whether a status was readable at all. */
  kind?: PublicationErrorKind;
}

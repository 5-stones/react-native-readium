/**
 * Where a publication's bytes are, as opposed to which publication it is,
 * and what happens when a request for them fails.
 */

import type { PublicationErrorKind } from './errors.nitro';

/** Why a location is being asked for. */
export type SourceRequestReason = 'open' | 'refresh';

/**
 * What `resolveSource` is being asked to resolve.
 *
 * An object rather than a bare url so that what is known about a request can
 * grow without changing the signature.
 */
export interface ResolveSourceRequest {
  /**
   * The `file.url` a location is wanted for — the publication's identity,
   * which the library holds and never fetches while `resolveSource` is set.
   */
  url: string;
  /**
   * Whether this is the first location for the publication, or a replacement
   * for one that stopped working.
   */
  reason: SourceRequestReason;
}

/**
 * Where a publication's bytes are, as opposed to which publication it is.
 *
 * Separate from `file.url` because a location can change — a credential in it
 * expires, a download is replaced — without the publication having changed.
 */
export interface PublicationSource {
  /** Where to read the publication from, now. */
  url: string;
}

/**
 * A request the library made for the publication, which failed.
 *
 * The same object everywhere: what iOS and Android report about a failed
 * read, what a web navigator reports about a failed fetch, and what
 * `shouldRefreshSource` is asked about.
 */
export interface SourceRequestFailure {
  /** The url that was requested. */
  url: string;
  /**
   * The HTTP status, when one could be read. On web it often cannot be: a
   * storage host that sends CORS headers on success but not on errors leaves
   * the browser reporting a bare network failure, with the status withheld.
   * Branch on `kind` rather than relying on this.
   */
  status?: number;
  /**
   * What was observed.
   *
   * - `http` — a response arrived and `status` is set.
   * - `unreadable` — the request failed without a readable status. A refused
   *   credential looks like this whenever the host omits CORS headers from its
   *   error responses, and so does being offline.
   */
  kind: PublicationErrorKind;
  /** The platform's own description of the failure, for logs. */
  detail?: string;
}

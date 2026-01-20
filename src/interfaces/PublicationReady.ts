import type { Link } from './Link';
import type { Locator } from './Locator';
import type { PublicationMetadata } from './PublicationMetadata';

/**
 * Event payload for onPublicationReady callback
 * Emitted when the publication has been loaded and all metadata is available
 */
export interface PublicationReadyEvent {
  /** Table of contents */
  tableOfContents: Link[];

  /** List of positions in the publication */
  positions: Locator[];

  /** Publication metadata */
  metadata: PublicationMetadata;
}

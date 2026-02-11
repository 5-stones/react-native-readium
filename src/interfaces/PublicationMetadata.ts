export type {
  Contributor,
  Subject,
  SeriesInfo,
  BelongsTo,
  AccessibilityCertification,
  Accessibility,
} from '../specs/ReadiumView.nitro';

import type { PublicationMetadata as SpecPublicationMetadata } from '../specs/ReadiumView.nitro';

/**
 * Publication metadata following Readium Web Publication Manifest spec.
 * Extends the Nitro spec metadata with @type and conformsTo fields.
 * @see https://readium.org/webpub-manifest/
 */
export interface PublicationMetadata extends SpecPublicationMetadata {
  /** Type of publication (e.g., "http://schema.org/Book") */
  '@type'?: string;

  /** Profile(s) this publication conforms to */
  conformsTo?: string[];
}

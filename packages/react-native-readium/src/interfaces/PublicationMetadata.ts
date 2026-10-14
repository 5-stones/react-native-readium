export type {
  Contributor,
  Subject,
  SeriesInfo,
  BelongsTo,
  AccessibilityCertification,
  Accessibility,
} from '../specs';

import type { PublicationMetadata as SpecPublicationMetadata } from '../specs';

/**
 * Publication metadata following Readium Web Publication Manifest spec.
 * Extends the Nitro spec metadata with the `@type` field.
 * @see https://readium.org/webpub-manifest/
 */
export interface PublicationMetadata extends SpecPublicationMetadata {
  /** Type of publication (e.g., "http://schema.org/Book") */
  '@type'?: string;
}

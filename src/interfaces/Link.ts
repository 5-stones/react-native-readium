import type { Link as SpecLink } from '../specs/ReadiumView.nitro';

/**
 * An interface representing the Readium Link object.
 * Extends the Nitro spec Link with an optional properties bag.
 */
export interface Link extends SpecLink {
  properties?: any;
}

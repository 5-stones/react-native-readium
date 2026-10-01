import type { Link as SpecLink } from '../specs/ReadiumView.nitro';

/**
 * An interface representing the Readium Link object.
 * Extends the Nitro spec Link with an optional properties bag
 * and supports hierarchical TOC via nested children.
 */
export interface Link extends Omit<SpecLink, 'depth' | 'hasChildren' | 'parentHref' | 'position'> {
  properties?: any;
  children?: Link[];
}

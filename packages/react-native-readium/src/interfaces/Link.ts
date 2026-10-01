import type { Link as SpecLink } from '../specs/ReadiumView.nitro';

/**
 * An interface representing the Readium Link object.
 * Extends the Nitro spec Link with an optional properties bag
 * and supports hierarchical TOC via nested children.
 */
export interface Link extends Omit<SpecLink, 'depth' | 'hasChildren' | 'parentHref' | 'position'> {
  /** The linked resource's media type, when known; the web reader sets it. */
  type?: string;
  properties?: any;
  children?: Link[];
}

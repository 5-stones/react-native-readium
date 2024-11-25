import { Locator } from './Locator';

/**
 * An interface representing the positions information in a publication.
 */
export interface Positions {
  /** Total number of positions in the publication. */
  total?: number;
  /** Positions organized by reading order. */
  positionsByReadingOrder?: Locator[][];
}

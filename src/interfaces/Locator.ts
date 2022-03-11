/**
 * An interface representing the Readium Locator object.
 */
export interface Locator {
  href: string;
  type: string;
  target: number;
  title?: string;
  locations: {
    position: number;
    progression: number;
    totalProgression: number;
  };
}

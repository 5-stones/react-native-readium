/**
 * An interface representing the Readium Locator object.
 */
export type Locator = {
  href: string;
  type: string;
  target?: number;
  title?: string;
  locations?: {
    progression: number;
    position?: number;
    totalProgression?: number;
  };
};

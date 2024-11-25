/**
 * An interface representing the Readium Metadata object.
 */
export interface Metadata {
  title: {
    und: string;
  };
  identifier: string;
  language: string[];
  author: {
    name: {
      und: string;
    };
    sortAs?: {
      und: string;
    };
  }[];
  description: string;
  published?: string;
  publisher?: {
    name: {
      und: string;
    };
  }[];
  subject?: {
    name: {
      und: string;
    };
  }[];
  presentation?: {
    layout: string;
    spread: string;
    overflow: string;
    orientation: string;
    continuous: boolean;
  };
  readingProgression: string;
  conformsTo?: string[];
}

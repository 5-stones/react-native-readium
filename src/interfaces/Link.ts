/**
 * An interface representing the Readium Link object.
 */
export interface Link {
  href: string;
  templated: boolean;
  type?: string | null;
  title?: string | null;
  rels?: Set<string>;
  properties?: any;
  height?: number | null;
  width?: number | null;
  bitrate?: number | null;
  duration?: number | null;
  languages?: string[];
  alternates?: Link[];
  children?: Link[];
}

/**
 * An interface representing the Readium Link object.
 */
export type Link = {
  href: string;
  templated: boolean;
  type?: string | undefined;
  title?: string | undefined;
  rels?: Set<string>;
  properties?: any;
  height?: number | undefined;
  width?: number | undefined;
  bitrate?: number | undefined;
  duration?: number | undefined;
  languages?: string[];
  alternates?: Link[];
  children?: Link[];
};

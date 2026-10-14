/**
 * What a publication says about itself: title, authors, subjects,
 * accessibility and where it belongs in a series.
 */

// ── Publication Metadata ─────────────────────────────────────────────────────

export interface Contributor {
  name: string;
  sortAs?: string;
  identifier?: string;
  role?: string;
  position?: number;
}

export interface Subject {
  name: string;
  sortAs?: string;
  code?: string;
  scheme?: string;
}

export interface SeriesInfo {
  name: string;
  position?: number;
}

export interface BelongsTo {
  series?: SeriesInfo[];
  collection?: SeriesInfo[];
}

export interface AccessibilityCertification {
  certifiedBy?: string;
  credential?: string;
  report?: string;
}

export interface Accessibility {
  conformsTo?: string[];
  certification?: AccessibilityCertification;
  accessMode?: string[];
  accessModeSufficient?: string[];
  feature?: string[];
  hazard?: string[];
  summary?: string;
}

export interface PublicationMetadata {
  title: string;
  sortAs?: string;
  subtitle?: string;
  identifier?: string;
  conformsTo?: string[];
  accessibility?: Accessibility;
  modified?: string;
  published?: string;
  language?: string[];
  author?: Contributor[];
  translator?: Contributor[];
  editor?: Contributor[];
  artist?: Contributor[];
  illustrator?: Contributor[];
  letterer?: Contributor[];
  penciler?: Contributor[];
  colorist?: Contributor[];
  inker?: Contributor[];
  narrator?: Contributor[];
  contributor?: Contributor[];
  publisher?: Contributor[];
  imprint?: Contributor[];
  subject?: Subject[];
  layout?: string;
  /**
   * The publication's own reading progression, as the publication declares it:
   * `ltr`, `rtl`, `ttb`, `btt` or `auto`. Not the preference of the same name,
   * which a reader sets and which takes only `ltr` or `rtl`.
   */
  readingProgression?: string;
  description?: string;
  duration?: number;
  numberOfPages?: number;
  belongsTo?: BelongsTo;
}

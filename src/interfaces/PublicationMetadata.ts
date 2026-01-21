/**
 * Contributor information for publication metadata
 */
export interface Contributor {
  name: string;
  sortAs?: string;
  identifier?: string;
  role?: string;
  position?: number;
}

/**
 * Subject/tag information
 */
export interface Subject {
  name: string;
  sortAs?: string;
  code?: string;
  scheme?: string;
}

/**
 * Collection membership information
 */
export interface BelongsTo {
  series?: Array<{ name: string; position?: number }>;
  collection?: Array<{ name: string; position?: number }>;
}

/**
 * Accessibility metadata
 */
export interface Accessibility {
  conformsTo?: string[];
  certification?: {
    certifiedBy?: string;
    credential?: string;
    report?: string;
  };
  accessMode?: string[];
  accessModeSufficient?: string[];
  feature?: string[];
  hazard?: string[];
  summary?: string;
}

/**
 * Publication metadata following Readium Web Publication Manifest spec
 * @see https://readium.org/webpub-manifest/
 */
export interface PublicationMetadata {
  /** Title of the publication (required) */
  title: string;

  /** Type of publication (e.g., "http://schema.org/Book") */
  '@type'?: string;

  /** Profile(s) this publication conforms to */
  conformsTo?: string | string[];

  /** Sorting key for the title */
  sortAs?: string;

  /** Subtitle */
  subtitle?: string;

  /** Unique identifier (URI format) */
  identifier?: string;

  /** Accessibility metadata */
  accessibility?: Accessibility;

  /** Last modification date */
  modified?: string;

  /** Publication date */
  published?: string;

  /** Language(s) of the publication (BCP 47 tags) */
  language?: string | string[];

  /** Authors */
  author?: Contributor[];

  /** Translators */
  translator?: Contributor[];

  /** Editors */
  editor?: Contributor[];

  /** Artists */
  artist?: Contributor[];

  /** Illustrators */
  illustrator?: Contributor[];

  /** Letterers */
  letterer?: Contributor[];

  /** Pencilers */
  penciler?: Contributor[];

  /** Colorists */
  colorist?: Contributor[];

  /** Inkers */
  inker?: Contributor[];

  /** Narrators */
  narrator?: Contributor[];

  /** Other contributors */
  contributor?: Contributor[];

  /** Publishers */
  publisher?: Contributor[];

  /** Imprints */
  imprint?: Contributor[];

  /** Subjects/tags */
  subject?: Subject[];

  /** Layout type */
  layout?: 'fixed' | 'reflowable' | 'scrolled';

  /** Reading direction */
  readingProgression?: 'rtl' | 'ltr';

  /** Description */
  description?: string;

  /** Duration in seconds (for audiobooks) */
  duration?: number;

  /** Number of pages */
  numberOfPages?: number;

  /** Collection membership */
  belongsTo?: BelongsTo;
}

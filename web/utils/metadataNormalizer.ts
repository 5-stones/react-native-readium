/**
 * Normalizes metadata to ensure consistent structure per RWPM spec.
 *
 * This normalizer is library-agnostic and based on the stable RWPM specification,
 * ensuring it works regardless of how the underlying Readium library serializes data.
 *
 * https://readium.org/webpub-manifest/
 */

/**
 * Normalizes a localized string per RWPM spec.
 *
 * Per RWPM spec, a localized string can be:
 * 1. Plain string: "Moby-Dick"
 * 2. Language map: {"en": "Moby-Dick", "fr": "Moby Dick"}
 *
 * Priority for language selection:
 * 1. "undefined" or "und" (default/undetermined language)
 * 2. "en" (English fallback)
 * 3. First available language
 *
 * https://readium.org/webpub-manifest/contexts/default/
 */
export function normalizeLocalizedString(value: any): string {
  if (!value) return '';

  // Format 1: Plain string (spec-compliant shorthand)
  if (typeof value === 'string') return value;

  // Format 2: Language map (spec-compliant full form)
  if (typeof value === 'object') {
    // Check if it's a LocalizedString instance with translations property
    if (value.translations) {
      const translations = value.translations;
      return translations['undefined'] ||
             translations['und'] ||
             translations['en'] ||
             Object.values(translations)[0] as string || '';
    }

    // Check if it's already a plain language map object
    return value['undefined'] ||
           value['und'] ||
           value['en'] ||
           Object.values(value)[0] as string || '';
  }

  return '';
}

/**
 * Normalizes contributors per RWPM spec.
 *
 * Per RWPM spec, a contributor can be:
 * 1. Plain string: "Herman Melville"
 * 2. Object: {"name": "Herman Melville", "sortAs": "Melville, Herman"}
 *
 * The Web library uses a Contributors class with an "items" property.
 *
 * https://readium.org/webpub-manifest/schema/contributor-object.schema.json
 */
export function normalizeContributors(value: any): any[] | undefined {
  if (!value) return undefined;

  // Handle TypeScript library's Contributors class format (has .items property)
  const items = value.items || value;

  if (!Array.isArray(items)) return undefined;

  return items.map((contributor: any) => {
    // Format 1: Plain string
    if (typeof contributor === 'string') {
      return { name: contributor };
    }

    // Format 2: Object with potentially localized fields
    const normalized: any = {
      name: normalizeLocalizedString(contributor.name),
    };

    if (contributor.sortAs) {
      normalized.sortAs = normalizeLocalizedString(contributor.sortAs);
    }
    if (contributor.identifier) {
      normalized.identifier = contributor.identifier;
    }
    if (contributor.role) {
      normalized.role = contributor.role;
    }
    if (contributor.position !== undefined) {
      normalized.position = contributor.position;
    }

    return normalized;
  }).filter(c => c.name); // Remove contributors without names
}

/**
 * Normalizes subjects per RWPM spec.
 *
 * Subject names can be LocalizedStrings.
 * The Web library uses a Subjects class with an "items" property.
 *
 * https://readium.org/webpub-manifest/schema/subject.schema.json
 */
export function normalizeSubjects(value: any): any[] | undefined {
  if (!value) return undefined;

  // Handle Subjects class format (has .items property)
  const items = value.items || value;

  if (!Array.isArray(items)) return undefined;

  return items.map((subject: any) => {
    // Format 1: Plain string
    if (typeof subject === 'string') {
      return { name: subject };
    }

    // Format 2: Object
    const normalized: any = {
      name: normalizeLocalizedString(subject.name),
    };

    if (subject.sortAs) {
      normalized.sortAs = normalizeLocalizedString(subject.sortAs);
    }
    if (subject.code) {
      normalized.code = subject.code;
    }
    if (subject.scheme) {
      normalized.scheme = subject.scheme;
    }

    return normalized;
  }).filter(s => s.name);
}

/**
 * Normalizes the entire metadata object per RWPM spec.
 *
 * This function is library-agnostic and based on the stable RWPM specification,
 * ensuring it works regardless of how the underlying Readium library serializes data.
 *
 * https://readium.org/webpub-manifest/
 */
export function normalizeMetadata(metadata: any): any {
  const normalized: any = {
    // Title is required
    title: normalizeLocalizedString(metadata.title),
  };

  // Optional localized string fields
  if (metadata.subtitle) {
    normalized.subtitle = normalizeLocalizedString(metadata.subtitle);
  }
  if (metadata.sortAs) {
    normalized.sortAs = normalizeLocalizedString(metadata.sortAs);
  }

  // Direct copy fields
  if (metadata.identifier) normalized.identifier = metadata.identifier;
  if (metadata.conformsTo) normalized.conformsTo = metadata.conformsTo;
  if (metadata.description) normalized.description = metadata.description;
  if (metadata.readingProgression) normalized.readingProgression = metadata.readingProgression;
  if (metadata.layout) normalized.layout = metadata.layout;
  if (metadata.duration) normalized.duration = metadata.duration;
  if (metadata.numberOfPages) normalized.numberOfPages = metadata.numberOfPages;

  // Date fields - convert to ISO strings
  if (metadata.modified) {
    normalized.modified = metadata.modified instanceof Date
      ? metadata.modified.toISOString()
      : metadata.modified;
  }
  if (metadata.published) {
    normalized.published = metadata.published instanceof Date
      ? metadata.published.toISOString()
      : metadata.published;
  }

  // Languages (Web uses plural 'languages', our interface uses singular 'language')
  if (metadata.languages) {
    normalized.language = metadata.languages;
  }

  // Normalize all contributor types (Web uses plural names, our interface uses singular)
  if (metadata.authors) normalized.author = normalizeContributors(metadata.authors);
  if (metadata.translators) normalized.translator = normalizeContributors(metadata.translators);
  if (metadata.editors) normalized.editor = normalizeContributors(metadata.editors);
  if (metadata.artists) normalized.artist = normalizeContributors(metadata.artists);
  if (metadata.illustrators) normalized.illustrator = normalizeContributors(metadata.illustrators);
  if (metadata.letterers) normalized.letterer = normalizeContributors(metadata.letterers);
  if (metadata.pencilers) normalized.penciler = normalizeContributors(metadata.pencilers);
  if (metadata.colorists) normalized.colorist = normalizeContributors(metadata.colorists);
  if (metadata.inkers) normalized.inker = normalizeContributors(metadata.inkers);
  if (metadata.narrators) normalized.narrator = normalizeContributors(metadata.narrators);
  if (metadata.contributors) normalized.contributor = normalizeContributors(metadata.contributors);
  if (metadata.publishers) normalized.publisher = normalizeContributors(metadata.publishers);
  if (metadata.imprints) normalized.imprint = normalizeContributors(metadata.imprints);

  // Normalize subjects
  if (metadata.subjects) {
    normalized.subject = normalizeSubjects(metadata.subjects);
  }

  // Copy complex objects as-is
  if (metadata.belongsTo) normalized.belongsTo = metadata.belongsTo;
  if (metadata.accessibility) normalized.accessibility = metadata.accessibility;

  return normalized;
}

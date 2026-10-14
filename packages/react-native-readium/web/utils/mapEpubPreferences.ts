import { EpubPreferences } from '@readium/navigator';

/**
 * Theme color mappings
 */
const THEME_COLORS = {
  light: {
    backgroundColor: '#ffffff',
    textColor: '#000000',
  },
  dark: {
    backgroundColor: '#000000',
    textColor: '#ffffff',
  },
  sepia: {
    backgroundColor: '#f4ecd8',
    textColor: '#5f4b32',
  },
};

// Base value for scaling pageMargins multiplier to pixels
// Matches Readium's default pageGutter of 20px
const PAGE_GUTTER_BASE = 20;

/**
 * Our column counts as the navigator's, which wants a number.
 *
 * Nothing translated these, and the navigator's guards discard a string — so
 * asking for two columns quietly did nothing.
 *
 * `auto` is the absence of a count, which is how the navigator spells it.
 */
const COLUMN_COUNTS: Record<string, number | null> = {
  'auto': null,
  'one': 1,
  'two': 2,
  // The deprecated spellings, still accepted; see `ReaderColumnCountLegacy`.
  '1': 1,
  '2': 2,
};

/**
 * The text alignments Readium CSS knows, as its `TextAlignment` enum lists
 * them. `center` and `end` are ours alone: the navigator's guard drops a value
 * it does not know, and mapping `end` onto `right` would be wrong in a
 * right-to-left publication.
 */
const WEB_TEXT_ALIGNMENTS = ['start', 'left', 'right', 'justify'];

export function mapEpubPreferences(
  preferences: Record<string, any>
): EpubPreferences {
  const mapped: Record<string, any> = { ...preferences };

  if (preferences.columnCount !== undefined) {
    mapped.columnCount = COLUMN_COUNTS[preferences.columnCount] ?? null;
  }

  // Dropped rather than sent: the navigator would discard it anyway, and
  // leaving it out says so where someone is reading this.
  if (
    preferences.textAlign !== undefined &&
    !WEB_TEXT_ALIGNMENTS.includes(preferences.textAlign)
  ) {
    delete mapped.textAlign;
  }

  // Map pageMargins to pageGutter (the navigator uses pageGutter, not pageMargins)
  // Our app uses a multiplier (0.5-4.0), but Readium expects pixel values
  // Scale the multiplier to pixels: multiplier * base (e.g., 1.0 * 20 = 20px)
  if (preferences.pageMargins !== undefined) {
    mapped.pageGutter = preferences.pageMargins * PAGE_GUTTER_BASE;
    delete mapped.pageMargins;
  }

  // Convert theme to backgroundColor and textColor
  // Only apply if backgroundColor/textColor aren't explicitly set
  if (
    preferences.theme &&
    !preferences.backgroundColor &&
    !preferences.textColor
  ) {
    const themeColors =
      THEME_COLORS[preferences.theme as keyof typeof THEME_COLORS];
    if (themeColors) {
      mapped.backgroundColor = themeColors.backgroundColor;
      mapped.textColor = themeColors.textColor;
    }
  }

  return mapped as EpubPreferences;
}

import { useDeepCompareEffect } from 'use-deep-compare';

import { EpubNavigator, EpubPreferences } from '@readium/navigator';

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

/**
 * Maps our app's preferences to the navigator's expected format
 */
function mapPreferencesToNavigator(preferences: any): EpubPreferences {
  const mapped: any = { ...preferences };

  // Map pageMargins to pageGutter (the navigator uses pageGutter, not pageMargins)
  if (preferences.pageMargins !== undefined) {
    mapped.pageGutter = preferences.pageMargins;
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

export const usePreferencesObserver = (
  navigator?: EpubNavigator | null,
  preferences?: any
) => {
  useDeepCompareEffect(() => {
    if (navigator && preferences) {
      const mappedPreferences = mapPreferencesToNavigator(preferences);
      navigator?.submitPreferences(mappedPreferences);
    }
  }, [preferences, !!navigator]);
};

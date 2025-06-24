import { useDeepCompareEffect } from 'use-deep-compare';

import type { Preferences } from '../../src/interfaces';

export const useSettingsObserver = (
  reader?: D2Reader | null,
  preferences?: Partial<Preferences> | null
) => {
  useDeepCompareEffect(() => {
    if (reader && preferences) {
      const settings = preferencesToUserSettings(preferences);
      reader?.applyUserSettings(settings);
    }
  }, [preferences, !!reader]);
};

const preferencesToUserSettings = (
  preferences: Preferences
): Partial<D2UserSettings> => ({
  appearance: preferences.theme
    ? themeToUserSettingsAppearance(preferences.theme)
    : undefined,
  fontSize: preferences.fontSize ? preferences.fontSize * 100 : undefined,
  // fontOverride: boolean;
  // fontFamily: number;
  verticalScroll: preferences.scroll,
  columnCount: columnCountToUserSettingsColumnCount(preferences.columnCount),
  // direction: number;
  wordSpacing: preferences.wordSpacing,
  letterSpacing: preferences.letterSpacing,
  pageMargins: preferences.pageMargins,
  lineHeight: preferences.lineHeight,
  // userProperties?: UserProperties;
  // view: BookView;
});

const themeToUserSettingsAppearance = (theme: Preferences['theme']) => {
  if (theme === 'dark') {
    return 'night';
  }

  if (theme === 'sepia') {
    return 'sepia';
  }

  return 'day';
};

const columnCountToUserSettingsColumnCount = (
  columnCount: Preferences['columnCount']
) => {
  if (columnCount === '1') {
    return 1;
  }

  if (columnCount === '2') {
    return 2;
  }

  return undefined;
};

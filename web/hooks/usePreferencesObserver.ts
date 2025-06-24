import { useDeepCompareEffect } from 'use-deep-compare';

import { EpubNavigator, EpubPreferences } from "@readium/navigator";

// import type { Preferences } from '../../src/interfaces';

export const usePreferencesObserver = (
  navigator?: EpubNavigator | null,
  preferences?: EpubPreferences | null
) => {
  useDeepCompareEffect(() => {
    if (navigator && preferences) {
      navigator?.submitPreferences(preferences);
    }
  }, [preferences, !!navigator]);
};

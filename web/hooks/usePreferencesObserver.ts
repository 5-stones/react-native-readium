import { useRef } from 'react';
import { useDeepCompareEffect } from 'use-deep-compare';

import type { EpubNavigator, EpubPreferences } from '@readium/navigator';

import { PdfNavigator } from '../classes';
import { assessCapabilities } from '../utils/capabilities';
import type {
  Preferences,
  PreferencesChangedEvent,
} from '../../src/interfaces';

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
 * Maps EPUB preferences into Readium format
 */
export function mapEpubPreferences(preferences: Record<string, any>): EpubPreferences {
  const mapped: Record<string, any> = { ...preferences };

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

/**
 * Maps PDF preferences into Readium format. Currently no preferences supported so no mapping.
 */
export function mapPdfPreferences(preferences: Record<string, any>): Preferences {
  return preferences;
}

export const usePreferencesObserver = (
  epubNavigator?: EpubNavigator | null,
  pdfNavigator?: PdfNavigator | null,
  preferences?: Record<string, any>,
  onPreferencesChanged?: (event: PreferencesChangedEvent) => void,
) => {
  // Track navigator identity so we re-apply preferences when the navigator
  // instance changes (not just when it goes from null → non-null).
  const navigatorId = useRef(0);
  const prevNavigator = useRef(navigator);

  if (prevNavigator.current !== navigator) {
    prevNavigator.current = navigator;
    navigatorId.current += 1;
  }

  useDeepCompareEffect(() => {
    if (!preferences) return;
    if (pdfNavigator) {
      const mappedPreferences = mapPdfPreferences(preferences)
      Promise.resolve(pdfNavigator.submitPreferences(mappedPreferences)).then(() => {
        onPreferencesChanged?.({ capabilities: assessCapabilities(pdfNavigator, mappedPreferences)});
      });
      return;
    }
    if (epubNavigator) {
      const mappedPreferences = mapEpubPreferences(preferences)
      Promise.resolve(epubNavigator.submitPreferences(mappedPreferences)).then(() => {
        onPreferencesChanged?.({ capabilities: assessCapabilities(epubNavigator, mappedPreferences as Preferences)});
      });
    }
  }, [preferences, navigatorId.current]);
};

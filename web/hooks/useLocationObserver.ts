import { useRef } from 'react';
import { useDeepCompareEffect } from 'use-deep-compare';
import { EpubNavigator } from '@readium/navigator';

import type { Link, Locator } from '../../src/interfaces';

export const useLocationObserver = (
  navigator?: EpubNavigator | null,
  location?: Link | Locator | null
) => {
  const lastHrefRef = useRef<string | null>(null);

  useDeepCompareEffect(() => {
    // Only navigate if we have a navigator, a location, and the href has changed.
    // Skip navigation if location.locations exists with progression and totalProgression
    // (it's from the navigator's positionChanged callback)
    const hasFullLocationData =
      'locations' in (location ?? {}) &&
      (location as Locator).locations?.progression !== undefined &&
      (location as Locator).locations?.totalProgression !== undefined;

    if (
      navigator &&
      location &&
      location.href !== lastHrefRef.current &&
      !hasFullLocationData
    ) {
      lastHrefRef.current = location.href;
      // For Link objects (from TOC), we can pass them directly
      // @ts-ignore
      navigator.go(location, true, () => {});
    }
  }, [location?.href, !!navigator]);
};

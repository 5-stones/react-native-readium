import { useRef } from 'react';
import { useDeepCompareEffect } from 'use-deep-compare';
import { EpubNavigator } from '@readium/navigator';

import type { Link, Locator } from '../../src/interfaces';

export const useLocationObserver = (
  navigator?: EpubNavigator | null,
  location?: Link | Locator | null
) => {
  // Track the last location we navigated to, preventing feedback loops:
  // navigator.go() → positionChanged → onLocationChange → setLocation → go() again
  const lastNavigatedRef = useRef<string | null>(null);

  const locator = location as Locator | null;
  const href = locator?.href;
  const progression = locator?.locations?.progression;

  useDeepCompareEffect(() => {
    if (!navigator || !location) return;

    const fingerprint = `${href}:${progression}`;

    if (fingerprint === lastNavigatedRef.current) {
      return;
    }

    lastNavigatedRef.current = fingerprint;
    // @ts-ignore
    navigator.go(location, true, () => {});
  }, [href, progression, !!navigator]);
};

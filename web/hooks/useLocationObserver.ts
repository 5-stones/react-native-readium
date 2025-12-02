import { useDeepCompareEffect } from 'use-deep-compare';
import { EpubNavigator } from '@readium/navigator';

import type { Link, Locator } from '../../src/interfaces';

export const useLocationObserver = (
  navigator?: EpubNavigator | null,
  location?: Link | Locator | null
) => {
  useDeepCompareEffect(() => {
    if (navigator && location) {
      // NOTE: technically this is a Link | Locator. However, under the hood the
      // R2D2BC is converting Links to locators, so just force the type here.
      // @ts-ignore
      navigator.go(location, true, () => { });
    }
  }, [
    location?.href,
    //@ts-ignore
    location?.locations,
    !!navigator,
  ]);
};

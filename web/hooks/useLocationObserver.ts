import { useDeepCompareEffect } from 'use-deep-compare';
import type D2Reader from '@d-i-t-a/reader';
import type { Locator as R2Locator } from '@d-i-t-a/reader';

import type { Link, Locator } from '../../src/interfaces';

export const useLocationObserver = (
  reader?: D2Reader | null,
  location?: Link | Locator | null,
) => {
  useDeepCompareEffect(() => {
    if (reader && location) {
      // NOTE: technically this is a Link | Locator. However, under the hood the
      // R2D2BC is converting Links to locators, so just force the type here.
      reader.goTo(location as R2Locator);
    }
  }, [
    location,
    !!reader,
  ]);
};

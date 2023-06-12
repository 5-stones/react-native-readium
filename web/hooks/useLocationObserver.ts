import { useDeepCompareEffect } from 'use-deep-compare';

import type { Link, Locator } from '../../src/interfaces';

export const useLocationObserver = (
  reader?: D2Reader | undefined,
  location?: Link | Locator | undefined
) => {
  useDeepCompareEffect(() => {
    if (reader && location) {
      // NOTE: technically this is a Link | Locator. However, under the hood the
      // R2D2BC is converting Links to locators, so just force the type here.
      void reader.goTo(location as R2Locator);
    }
  }, [location, Boolean(reader)]);
};

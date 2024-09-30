import { useDeepCompareEffect } from 'use-deep-compare';

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
    location?.href,
    //@ts-ignore
    location?.locations,
    !!reader,
  ]);
};

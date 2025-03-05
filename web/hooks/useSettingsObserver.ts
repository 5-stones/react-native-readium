import { useDeepCompareEffect } from 'use-deep-compare';

import type { Settings } from '../../src/interfaces';

export const useSettingsObserver = (
  reader?: D2Reader | null,
  settings?: Partial<Settings> | null
) => {
  useDeepCompareEffect(() => {
    if (reader && settings) {
      // @ts-ignore - FIXME need to do some deeper investigation if these
      // are equivalent or not
      reader?.applyUserSettings(settings as Partial<D2UserSettings>);
    }
  }, [settings, !!reader]);
};

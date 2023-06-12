import { useDeepCompareEffect } from 'use-deep-compare';

import type { Settings } from '../../src/interfaces';

export const useSettingsObserver = (
  reader?: D2Reader | undefined,
  settings?: Partial<Settings> | undefined
) => {
  useDeepCompareEffect(() => {
    if (reader && settings) {
      // FIXME need to do some deeper investigation if these are equivalent or not
      void reader?.applyUserSettings(settings as Partial<D2UserSettings>);
    }
  }, [settings, Boolean(reader)]);
};

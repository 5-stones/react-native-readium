import { useDeepCompareEffect } from 'use-deep-compare';
export const useSettingsObserver = (reader, settings) => {
    useDeepCompareEffect(() => {
        if (reader && settings) {
            // @ts-ignore - FIXME need to do some deeper investigation if these
            // are equivalent or not
            reader?.applyUserSettings(settings);
        }
    }, [
        settings,
        !!reader,
    ]);
};

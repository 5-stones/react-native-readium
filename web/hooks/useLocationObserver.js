import { useDeepCompareEffect } from 'use-deep-compare';
export const useLocationObserver = (reader, location) => {
    useDeepCompareEffect(() => {
        if (reader && location) {
            // NOTE: technically this is a Link | Locator. However, under the hood the
            // R2D2BC is converting Links to locators, so just force the type here.
            reader.goTo(location);
        }
    }, [
        location,
        !!reader,
    ]);
};

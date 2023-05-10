import { useEffect, useRef } from 'react';

import type { ReadiumProps } from '../../src/components/ReadiumView';
import type { Locator } from '../../src/interfaces';

export const useReaderRef = ({
  file,
  onLocationChange,
  onTableOfContents,
}: Pick<ReadiumProps, 'file' | 'onLocationChange' | 'onTableOfContents' >) => {
  const readerRef = useRef<D2Reader | null>(null);

  useEffect(() => {
    async function run() {
      const D2Reader = await import('@d-i-t-a/reader');
      const ref = await D2Reader.load({
        url: new URL(file.url),
        lastReadingPosition: file.initialLocation,
        userSettings: { verticalScroll: false },
        api: {
          updateCurrentLocation: async (location: Locator) => {
            if (onLocationChange) onLocationChange(location);
            return location;
          },
        },
        injectables: injectables,
      });

      if (onTableOfContents) {
        onTableOfContents(ref.tableOfContents);
      }
      readerRef.current = ref;
    }
    run();
  }, []);

  return readerRef
};

// NOTE: right now we're serving these through statically.io, which is just
// pulling them from Github... Might not be the best way and maybe we should
// consider bundling them with the library.
const injectables: any[] = [
  {
    type: "style",
    url: "https://cdn.statically.io/gh/d-i-t-a/R2D2BC/production/viewer/readium-css/ReadiumCSS-before.css",
    r2before: true,
  },
  {
    type: "style",
    url: "https://cdn.statically.io/gh/d-i-t-a/R2D2BC/production/viewer/readium-css/ReadiumCSS-default.css",
    r2default: true,
  },
  {
    type: "style",
    url: "https://cdn.statically.io/gh/d-i-t-a/R2D2BC/production/viewer/readium-css/ReadiumCSS-after.css",
    r2after: true,
  },
];


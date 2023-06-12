import { useEffect, useRef } from 'react';

import type { ReadiumProps } from '../../src/components/ReadiumView';
import type { Link, Locator } from '../../src/interfaces';

export const useReaderRef = ({
  file,
  onLocationChange,
  onTableOfContents,
}: Pick<ReadiumProps, 'file' | 'onLocationChange' | 'onTableOfContents'>) => {
  const readerRef = useRef<D2Reader>();

  useEffect(() => {
    async function run() {
      const d2Reader = await import('@d-i-t-a/reader');
      const ref = await d2Reader.load({
        url: new URL(file.url),
        lastReadingPosition: file.initialLocation,
        userSettings: { verticalScroll: false },
        api: {
          async updateCurrentLocation(location: Locator) {
            if (onLocationChange) onLocationChange(location);
            return location;
          },
        },
        injectables,
      });

      if (onTableOfContents) {
        onTableOfContents(ref.tableOfContents as Link[]);
      }

      readerRef.current = ref;
    }

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return readerRef;
};

// NOTE: right now we're serving these through statically.io, which is just
// pulling them from Github... Might not be the best way and maybe we should
// consider bundling them with the library.
const injectables: any[] = [
  {
    type: 'style',
    url: 'https://cdn.statically.io/gh/d-i-t-a/R2D2BC/production/viewer/readium-css/ReadiumCSS-before.css',
    r2before: true,
  },
  {
    type: 'style',
    url: 'https://cdn.statically.io/gh/d-i-t-a/R2D2BC/production/viewer/readium-css/ReadiumCSS-default.css',
    r2default: true,
  },
  {
    type: 'style',
    url: 'https://cdn.statically.io/gh/d-i-t-a/R2D2BC/production/viewer/readium-css/ReadiumCSS-after.css',
    r2after: true,
  },
];

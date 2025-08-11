import { useCallback, useEffect, useRef, useState } from 'react';

import type { ReadiumProps } from '../../src/components/ReadiumView';
import type { Locator } from '../../src/interfaces';

export const useReaderRef = ({
  file,
  onLocationChange,
  onTableOfContents,
}: Pick<ReadiumProps, 'file' | 'onLocationChange' | 'onTableOfContents'>) => {
  const readerRef = useRef<D2Reader | null>(null);
  const readingOrder = useRef<Locator[]>([]);

  const onLocationChangeWithTotalProgression = useCallback(
    (newLocation: Locator) => {
      if (
        !onLocationChange ||
        !readingOrder.current ||
        !newLocation.locations
      ) {
        return;
      }
      if (!newLocation.locations.totalProgression) {
        const newLocationIndex = readingOrder.current.findIndex(
          (entry) => entry.href === newLocation.href
        );
        if (newLocationIndex < 0 || !readingOrder.current[newLocationIndex]) {
          return;
        }
        const readingOrderCount = readingOrder.current.length;
        const chapterTotalProgression =
          readingOrder.current[newLocationIndex].locations?.totalProgression ||
          0;
        const intraChapterTotalProgression =
          newLocation.locations.progression / readingOrderCount;
        newLocation.locations.totalProgression =
          chapterTotalProgression + intraChapterTotalProgression;
      }
      onLocationChange(newLocation);
    },
    [onLocationChange]
  );

  useEffect(() => {
    async function run() {
      const D2Reader = await import('@d-i-t-a/reader');
      const ref = await D2Reader.load({
        url: new URL(file.url),
        lastReadingPosition: file.initialLocation,
        userSettings: { verticalScroll: false },
        api: {
          updateCurrentLocation: async (location: Locator) => {
            onLocationChangeWithTotalProgression(location);
            return location;
          },
        },
        injectables: injectables,
      });

      if (onTableOfContents) {
        onTableOfContents(ref.tableOfContents);
      }

      // This way of estimating the totalProgression treats all reading order
      // entries as equal in length.
      // It is based on the implementation in the Readium Go toolkit
      // https://github.com/readium/go-toolkit/blob/31c6a65b588f825ffb6b4f2445337ffdc53af685/pkg/pub/service_positions.go#L66
      const oldReadingOrder: Locator[] = ref.readingOrder;
      const readingOrderCount = oldReadingOrder.length;
      readingOrder.current = oldReadingOrder.map((item, index) => {
        const totalProgression = index / readingOrderCount;
        return {
          ...item,
          locations: {
            ...item.locations,
            progression: 0,
            totalProgression: totalProgression,
          },
        };
      });

      readerRef.current = ref;
    }
    run();
  }, [file.url]);

  return readerRef;
};

// NOTE: right now we're serving these through statically.io, which is just
// pulling them from Github... Might not be the best way and maybe we should
// consider bundling them with the library.
const injectables: any[] = [
  {
    type: 'style',
    url: 'https://cdn.jsdelivr.net/gh/d-i-t-a/R2D2BC@refs/tags/2.4.10/viewer/readium-css/ReadiumCSS-before.css',
    r2before: true,
  },
  {
    type: 'style',
    url: 'https://cdn.jsdelivr.net/gh/d-i-t-a/R2D2BC@refs/tags/2.4.10/viewer/readium-css/ReadiumCSS-default.css',
    r2default: true,
  },
  {
    type: 'style',
    url: 'https://cdn.jsdelivr.net/gh/d-i-t-a/R2D2BC@refs/tags/2.4.10/viewer/readium-css/ReadiumCSS-after.css',
    r2after: true,
  },
];

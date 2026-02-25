import { useCallback, useEffect, useRef, useState } from 'react';

import { EpubNavigator } from '@readium/navigator';
import { Locator, Publication } from '@readium/shared';

import type { ReadiumProps } from '../../src/components/ReadiumView';
import {
  createNavigatorListeners,
  createPositions,
  extractTableOfContents,
  fetchManifest,
  normalizeMetadata,
  normalizePublicationURL,
  sanitizeInitialLocation,
} from '../utils';

interface RefProps
  extends Pick<
    ReadiumProps,
    'file' | 'onLocationChange' | 'onPublicationReady'
  > {
  container: HTMLElement | null;
  onPositionChange?: (position: number | null) => void;
}

export const useNavigator = ({
  file,
  onLocationChange,
  onPublicationReady,
  container,
  onPositionChange,
}: RefProps) => {
  const [navigator, setNavigator] = useState<EpubNavigator | null>(null);
  const navigatorRef = useRef<EpubNavigator | null>(null);
  const [positions, setPositions] = useState<Locator[]>([]);
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

      let totalProgression = newLocation.locations.totalProgression;

      if (!totalProgression) {
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

        const newLocationProgression = newLocation.locations.progression || 0;
        const intraChapterTotalProgression =
          newLocationProgression / readingOrderCount;
        totalProgression =
          chapterTotalProgression + intraChapterTotalProgression;
      }

      // Create a new location object with the calculated totalProgression
      const updatedLocation = {
        ...newLocation,
        locations: {
          ...newLocation.locations,
          progression: newLocation.locations.progression || 0,
          totalProgression,
        },
      };

      // @ts-ignore - Type compatibility between Readium Locator and our Locator interface
      onLocationChange(updatedLocation);
    },
    [onLocationChange]
  );

  useEffect(() => {
    let cancelled = false;

    async function initializeNavigator() {
      if (!container) return;

      // 1. Normalize the publication URL
      const publicationURL = normalizePublicationURL(file.url);

      // 2. Fetch and deserialize the manifest
      const { manifest, fetcher } = await fetchManifest(publicationURL);
      if (cancelled) return;

      // 3. Create the publication
      const publication = new Publication({ manifest, fetcher });

      // 4. Create positions array for navigation
      // Try loading granular positions from manifest (generated server-side),
      // fall back to chapter-based positions for older manifests
      let positionsArray: Locator[];
      try {
        const manifestPositions = await publication.positionsFromManifest();
        positionsArray = manifestPositions.length > 0
          ? manifestPositions
          : createPositions(publication);
      } catch {
        positionsArray = createPositions(publication);
      }
      if (cancelled) return;

      readingOrder.current = positionsArray;
      setPositions(positionsArray);

      // 5. Create navigator listeners
      const listeners = createNavigatorListeners(
        onLocationChangeWithTotalProgression,
        onPositionChange
      );

      // 6. Process initial location, sanitizing the position number to match
      // the resolved positions array (handles scheme mismatch between sessions)
      const initialPosition = sanitizeInitialLocation(
        file.initialLocation,
        positionsArray
      );

      // 7. Initialize and load the navigator
      const configuration = {
        preferences: { scroll: false },
        defaults: {},
      };

      const nav = new EpubNavigator(
        container,
        publication,
        listeners,
        positionsArray,
        initialPosition, // Pass the initial position
        configuration as any
      );
      await nav.load();
      if (cancelled) return;

      // 8. Emit onPublicationReady event
      if (onPublicationReady) {
        const tocItems = extractTableOfContents(manifest);
        const metadata = normalizeMetadata(manifest.metadata);

        // @ts-ignore - Type compatibility between Readium types and our interfaces
        onPublicationReady({
          tableOfContents: tocItems,
          // @ts-ignore
          positions: positionsArray,
          metadata: metadata,
        });
      }

      navigatorRef.current = nav;
      setNavigator(nav);
    }

    initializeNavigator();

    return () => {
      cancelled = true;
      navigatorRef.current?.destroy();
      navigatorRef.current = null;
      setNavigator(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.url, container]);

  return { navigator, positions };
};

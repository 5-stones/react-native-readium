import { useCallback, useEffect, useRef, useState } from 'react';
import { useDeepCompareEffect } from 'use-deep-compare';

import { EpubNavigator, EpubPreferences } from '@readium/navigator';
import { Locator, Publication } from '@readium/shared';

import type { ReadiumProps } from '../../src/components/ReadiumView';
import type { Preferences } from '../../src/interfaces/Preferences'
import {
  assessCapabilities,
  createNavigatorListeners,
  createPositions,
  extractTableOfContents,
  fetchManifest,
  mapEpubPreferences,
  normalizeMetadata,
  normalizePublicationURL,
  sanitizeInitialLocation,
} from '../utils';
import { toPublicationErrorEvent } from '../../src/utils/publicationError';

interface RefProps
  extends Pick<
    ReadiumProps,
    'file' | 'onLocationChange' | 'onPublicationReady' | 'onPreferencesChanged' | 'onPublicationError'
  > {
  /** Always set: ReadiumView defaults it. */
  preferences: NonNullable<ReadiumProps['preferences']>;
  container: HTMLElement | null;
  onPositionChange?: (position: number | null) => void;
}

export const useEpubNavigator = ({
  file,
  preferences,
  onLocationChange,
  onPublicationReady,
  onPreferencesChanged,
  onPublicationError,
  container,
  onPositionChange,
}: RefProps) => {
  const [navigator, setNavigator] = useState<EpubNavigator | null>(null);
  const [navigatorId, setNavigatorId] = useState(0);
  const navigatorRef = useRef<EpubNavigator | null>(null);
  const [positions, setPositions] = useState<Locator[]>([]);
  const readingOrder = useRef<Locator[]>([]);

  const isEpubUrl = (url: string) => url.toLowerCase().endsWith('manifest.json');
  const isEpub = !!file?.url && isEpubUrl(file.url);

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
    if (!isEpub || !container) return;

    const epubContainer = container;

    let cancelled = false;

    async function initializeNavigator() {
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
        preferences,
        defaults: { scroll: false },
      };

      const nav = new EpubNavigator(
        epubContainer,
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
          capabilities: assessCapabilities(nav, preferences),
          isProtected: false,
        });
      }

      navigatorRef.current = nav;
      setNavigator(nav);
      setNavigatorId((prev) => prev + 1)
    }

    initializeNavigator().catch((error) => {
      if (cancelled) return;
      console.error('[react-native-readium] failed to open EPUB', error);
      onPublicationError?.(toPublicationErrorEvent({ url: file.url, code: 'openFailed', message: String(error?.message ?? error) }));
    });

    return () => {
      cancelled = true;
      navigatorRef.current?.destroy();
      navigatorRef.current = null;
      setNavigator(null);
    };
  }, [isEpub, file.url, container]);

  useDeepCompareEffect(() => {
    if (!navigator || !preferences) return;

    const mappedPreferences = mapEpubPreferences(preferences);
    Promise.resolve(
      navigator.submitPreferences(mappedPreferences as EpubPreferences)
    ).then(() => {
      onPreferencesChanged?.({
        capabilities: assessCapabilities(navigator, mappedPreferences as Preferences),
      });
    });
  }, [preferences, navigatorId]);

  if (!isEpub) {
    return { navigator: undefined, positions: [] };
  }

  return { navigator, positions };
};

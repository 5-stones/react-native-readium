import { useCallback, useEffect, useRef, useState } from 'react';

import {
  BasicTextSelection,
  FrameClickEvent,
} from '@readium/navigator-html-injectables';
import { EpubNavigator, EpubNavigatorListeners } from '@readium/navigator';
import {
  Locator,
  LocatorLocations,
  Manifest,
  Publication,
} from '@readium/shared';
import { Fetcher } from '@readium/shared';
import { HttpFetcher } from '@readium/shared';
import { Link } from '@readium/shared';

import type { ReadiumProps } from '../../src/components/ReadiumView';
import { normalizeManifest } from '../utils/manifestNormalizer';
import { normalizeMetadata } from '../utils/metadataNormalizer';

interface RefProps
  extends Pick<
    ReadiumProps,
    'file' | 'onLocationChange' | 'onPublicationReady'
  > {
  container: HTMLElement | null;
}

export const useNavigator = ({
  file,
  onLocationChange,
  onPublicationReady,
  container,
}: RefProps) => {
  const [navigator, setNavigator] = useState<EpubNavigator | null>(null);
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
    async function run() {
      if (!container) return;
      let publicationURL = file.url;

      // Normalize the URL like the vanilla testapp does
      // If it ends with manifest.json, extract the base directory
      // Otherwise ensure it ends with /
      if (publicationURL.endsWith('manifest.json')) {
        // Extract the directory part: https://alice.dita.digital/manifest.json -> https://alice.dita.digital/
        publicationURL = publicationURL.substring(
          0,
          publicationURL.lastIndexOf('/') + 1
        );
      } else if (!publicationURL.endsWith('/')) {
        publicationURL += '/';
      }

      const manifestLink = new Link({ href: 'manifest.json' });
      const fetcher: Fetcher = new HttpFetcher(undefined, publicationURL);
      const fetched = fetcher.get(manifestLink);
      const selfLink = (await fetched.link()).toURL(publicationURL)!;

      const response = await fetched.readAsJSON();

      // Normalize the manifest to ensure compatibility with the navigator
      const responseObj = normalizeManifest(response as any);

      let manifest;
      try {
        manifest = Manifest.deserialize(responseObj as string);
      } catch (error) {
        console.error('Error during manifest deserialization:', error);
        console.error('Manifest that failed:', responseObj);
        throw error;
      }
      if (!manifest) {
        console.error(
          'Failed to deserialize manifest (returned null/undefined):',
          responseObj
        );
        throw new Error('Manifest deserialization returned null/undefined');
      }
      manifest.setSelfLink(selfLink);

      const publication = new Publication({
        manifest: manifest,
        fetcher: fetcher,
      });

      const listeners: EpubNavigatorListeners = {
        frameLoaded: function (_wnd: Window): void {
          // noop
        },
        positionChanged: function (_locator: Locator): void {
          onLocationChangeWithTotalProgression(_locator);
          window.focus();
        },
        tap: function (_e: FrameClickEvent): boolean {
          return false;
        },
        click: function (_e: FrameClickEvent): boolean {
          return false;
        },
        zoom: function (_scale: number): void {
          // noop
        },
        miscPointer: function (_amount: number): void {
          // noop
        },
        scroll: function (_amount: number): void {
          // noop
        },
        customEvent: function (_key: string, _data: unknown): void {},
        handleLocator: function (locator: Locator): boolean {
          const href = locator.href;
          if (
            href.startsWith('http://') ||
            href.startsWith('https://') ||
            href.startsWith('mailto:') ||
            href.startsWith('tel:')
          ) {
            if (confirm(`Open "${href}" ?`)) window.open(href, '_blank');
          } else {
            console.warn('Unhandled locator', locator);
          }
          return false;
        },
        textSelected: function (_selection: BasicTextSelection): void {
          // noop
        },
      };

      // Create positions array from the publication's reading order
      // NOTE: The published npm packages (v2.2.5) seem to require positions to be passed explicitly,
      // whereas the latest source code in the ts-toolkit repo might generate them automatically.
      // This is a workaround for the published package version.
      const positions: Locator[] = publication.readingOrder.items.map(
        (link: any, idx: number) => {
          const position = idx + 1;
          return new Locator({
            href: link.href,
            type: link.type,
            title: link.title,
            locations: new LocatorLocations({
              position: position,
              progression: 0,
              totalProgression: idx / publication.readingOrder.items.length,
            }),
          });
        }
      );

      // Store reading order for totalProgression calculation
      readingOrder.current = positions;

      // Try passing a configuration with default preferences
      const configuration = {
        preferences: {
          scroll: false,
        },
        defaults: {},
      };

      const nav = new EpubNavigator(
        container,
        publication,
        listeners,
        positions, // Pass the positions array we created
        undefined, // initialPosition
        configuration as any
      );
      await nav.load();

      // Extract TOC items
      const tocItems = Array.isArray(manifest.toc)
        ? manifest.toc
        : // @ts-ignore
          manifest.toc.items || [];

      // Emit onPublicationReady event
      if (onPublicationReady) {
        // Normalize metadata using spec-based approach
        // This handles LocalizedStrings and Contributors per RWPM spec
        const metadata = normalizeMetadata(manifest.metadata);

        // @ts-ignore - Type compatibility between Readium types and our interfaces
        onPublicationReady({
          // @ts-ignore
          tableOfContents: tocItems,
          // @ts-ignore
          positions: positions,
          metadata: metadata,
        });
      }

      setNavigator(nav);
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.url, container]);

  return navigator;
};

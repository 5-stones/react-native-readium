import { useCallback, useEffect, useRef, useState } from 'react';

import { BasicTextSelection, FrameClickEvent } from "@readium/navigator-html-injectables";
import { EpubNavigator, EpubNavigatorListeners } from "@readium/navigator";
import { Locator, Manifest, Publication } from "@readium/shared";
import { Fetcher } from "@readium/shared";
import { HttpFetcher } from "@readium/shared";
import { Link } from "@readium/shared";

import type { ReadiumProps } from '../../src/components/ReadiumView';

interface RefProps extends Pick<ReadiumProps, 'file' | 'onLocationChange' | 'onTableOfContents'> {
  container: HTMLElement | null;
}

export const useNavigator = ({
  file,
  onLocationChange,
  onTableOfContents,
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

        const newLocationProgression = newLocation.locations.progression || 0;
        const intraChapterTotalProgression =
          newLocationProgression / readingOrderCount;
        newLocation.locations.totalProgression =
          chapterTotalProgression + intraChapterTotalProgression;
      }
      onLocationChange(newLocation);
    },
    [onLocationChange]
  );

  useEffect(() => {
    async function run() {
      if (!container) return;
      const publicationURL = file.url;
      const manifestLink = new Link({ href: "manifest.json" });
      const fetcher: Fetcher = new HttpFetcher(undefined, publicationURL);
      const fetched = fetcher.get(manifestLink);
      const selfLink = (await fetched.link()).toURL(publicationURL)!;

      const response = await fetched.readAsJSON();
      (response as any).links = [{
        rel: 'self',
        href: publicationURL + '/manifest.json',
        type: 'application/webpub+json',
      }];
      const manifest = Manifest.deserialize(response as string)!;
      manifest.setSelfLink(selfLink);
      const publication = new Publication({ manifest: manifest, fetcher: fetcher });


      const listeners: EpubNavigatorListeners = {
        frameLoaded: function (_wnd: Window): void {
          console.log(">>>>>>>> frameLoaded");
        },
        positionChanged: function (_locator: Locator): void {
          console.log(">>>>>>>> positionChanged", _locator);
          window.focus();
        },
        tap: function (_e: FrameClickEvent): boolean {
          console.log(">>>>>>>> tap");
          return false;
        },
        click: function (_e: FrameClickEvent): boolean {
          console.log(">>>>>>>> click");
          return false;
        },
        zoom: function (_scale: number): void {
          console.log(">>>>>>>> zoom");
        },
        miscPointer: function (_amount: number): void {
          console.log(">>>>>>>> miscPointer");
        },

        customEvent: function (_key: string, _data: unknown): void {
        },
        handleLocator: function (locator: Locator): boolean {
          const href = locator.href;
          if (href.startsWith("http://") ||
            href.startsWith("https://") ||
            href.startsWith("mailto:") ||
            href.startsWith("tel:")) {
            if (confirm(`Open "${href}" ?`))
              window.open(href, "_blank");
          } else {
            console.warn("Unhandled locator", locator);
          }
          return false;
        },
        textSelected: function (_selection: BasicTextSelection): void {
          throw new Error('Function not implemented.');
        }
      }

      const readingOrder = (response as any).readingOrder;
      const positions = readingOrder.map((p: any, idx: number) => {
        p.locations = {
          position: idx,
          progression: (idx + 1 / readingOrder.length)
        }
        return p;
      });

      const nav = new EpubNavigator(
        container,
        publication,
        listeners,
        positions,
        positions[0],
      );
      await nav.load();
      if (onTableOfContents && publication.tableOfContents) {
        console.log(">>>>>>> publication.tableOfContents", publication.tableOfContents);
        const links = publication.tableOfContents.items;
        onTableOfContents(links);
      }

      setNavigator(nav);
    }
    run();
  }, [file.url, container]);

  return navigator;
};

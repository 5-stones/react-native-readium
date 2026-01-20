import {
  BasicTextSelection,
  FrameClickEvent,
} from '@readium/navigator-html-injectables';
import { EpubNavigatorListeners } from '@readium/navigator';
import { Locator } from '@readium/shared';

/**
 * Creates navigator listeners for handling navigation events
 */
export function createNavigatorListeners(
  onLocationChangeWithTotalProgression: (locator: Locator) => void,
  onPositionChange?: (position: number | null) => void
): EpubNavigatorListeners {
  return {
    frameLoaded: function (_wnd: Window): void {
      // noop
    },
    positionChanged: function (_locator: Locator): void {
      onLocationChangeWithTotalProgression(_locator);
      if (onPositionChange) {
        onPositionChange(_locator.locations?.position || null);
      }
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
}

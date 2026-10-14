import {
  BasicTextSelection,
  ContextMenuEvent,
  FrameClickEvent,
  KeyboardEventData,
  SuspiciousActivityEvent,
} from '@readium/navigator-html-injectables';
import { EpubNavigatorListeners } from '@readium/navigator';
import { Locator, TimelineItem } from '@readium/shared';

/**
 * Creates navigator listeners for handling navigation events
 */
export function createNavigatorListeners(
  onLocationChangeWithTotalProgression: (locator: Locator) => void,
  onPositionChange?: (position: number | null) => void,
  /** The reader selected some text, or cleared what was selected. */
  onTextSelected?: (selection: BasicTextSelection | null) => void
): EpubNavigatorListeners {
  return {
    frameLoaded: function (_wnd: Window): void {
      // Deliberately unused: the navigator always passes `_cframes[0]`, not
      // the frame that loaded, so the argument is only right in a
      // single-column layout. Nothing can be keyed on it.
    },
    positionChanged: function (_locator: Locator): void {
      onLocationChangeWithTotalProgression(_locator);
      if (onPositionChange) {
        onPositionChange(_locator.locations?.position || null);
      }
      window.focus();
    },
    tap: function (_e: FrameClickEvent): boolean {
      // The browser drops the selection on a tap, so whatever was shown for
      // it goes too. Not consumed: the navigator still turns the page.
      onTextSelected?.(null);
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
    textSelected: function (selection: BasicTextSelection): void {
      // An empty selection is the browser reporting one being cleared, which
      // reads the same to a consumer as there being nothing selected.
      onTextSelected?.(selection.text ? selection : null);
    },
    contentProtection: function (
      _type: string,
      _data: SuspiciousActivityEvent
    ): void {
      // noop
    },
    contextMenu: function (_data: ContextMenuEvent): void {
      // noop
    },
    peripheral: function (_data: KeyboardEventData): void {
      // noop
    },
    timelineItemChanged: function (_item: TimelineItem | undefined): void {
      // noop
    },
  };
}

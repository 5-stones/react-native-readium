import type { Locator as NavigatorLocator } from '@readium/shared';

import type { Locator } from '../../src/interfaces';

/**
 * Where a selection is on screen, in the reader's own coordinates.
 *
 * Not part of the public event: the selection menu is the library's to draw
 * on web, so where to draw it is the library's business. A consumer is told
 * what was selected and where in the publication, which is what it can act
 * on.
 */
export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A selection the reader has made, as the web half tracks it. */
export interface WebSelection {
  locator: Locator;
  selectedText: string;
  rect: SelectionRect;
}

/**
 * The navigator's locator as the view reports them: a plain object, where the
 * navigator's is a class with behaviour that cannot cross the bridge.
 *
 * The navigator builds a selection's locator from the chapter's href and the
 * selected text, with no `locations` — which is enough for a decoration,
 * since the injectable anchors one by searching for `text.highlight`. It is
 * also why a phrase that appears twice in a chapter may be decorated at the
 * wrong occurrence: there is no `before` or `after` to tell them apart.
 */
export const toReadiumViewLocator = (locator: NavigatorLocator): Locator => ({
  href: locator.href,
  type: locator.type ?? 'application/xhtml+xml',
  title: locator.title ?? undefined,
  locations: locator.locations
    ? {
        progression: locator.locations.progression ?? undefined,
        position: locator.locations.position ?? undefined,
        totalProgression: locator.locations.totalProgression ?? undefined,
      }
    : undefined,
  text: locator.text
    ? {
        before: locator.text.before ?? undefined,
        highlight: locator.text.highlight ?? undefined,
        after: locator.text.after ?? undefined,
      }
    : undefined,
});

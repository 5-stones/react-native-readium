import { useRef } from 'react';
import type { EpubNavigator } from '@readium/navigator';
import { useDeepCompareEffect } from 'use-deep-compare';

import type {
  Decoration,
  DecorationGroups,
  DecorationActivatedEvent,
  DecorationStyle,
} from '../../src/interfaces';
import { convertToNavigatorLocator } from '../utils/locationNormalizer';

/**
 * What the navigator wants a decoration to look like.
 *
 * Its own vocabulary, which ours is a subset of: `highlight` and `underline`
 * are the two we document, and the rest of its built-ins pass through for
 * anyone who names them. A `custom` style becomes a template, which is how the
 * navigator takes caller-supplied HTML.
 *
 * `isActive` has no equivalent here and is dropped: the navigator has no
 * notion of an active decoration, so it stays native-only.
 */
const toNavigatorStyle = (style: DecorationStyle): Record<string, unknown> => {
  if (style.type === 'custom') {
    return {
      type: 'template',
      element: style.html ?? '',
      stylesheet: style.css,
      layout: style.layout ?? 'bounds',
      width: style.width ?? 'wrap',
    };
  }

  return {
    type: style.type,
    tint: style.tint,
    ...(style.layout ? { layout: style.layout } : {}),
    ...(style.width ? { width: style.width } : {}),
  };
};

/**
 * A decoration as the navigator takes it: ours, minus what it cannot use, with
 * the locator as one of its own — the navigator's is a class with behaviour,
 * not the plain object that crosses the bridge.
 *
 * Undefined where the locator cannot be read, so a decoration with nowhere to
 * go is left out rather than handed over half-built.
 */
const toNavigatorDecoration = (decoration: Decoration) => {
  const locator = convertToNavigatorLocator(decoration.locator);
  if (!locator) return undefined;

  return {
    id: decoration.id,
    locator,
    style: toNavigatorStyle(decoration.style),
    extras: decoration.extras,
  };
};

/**
 * Renders decorations, and reports the ones the reader taps.
 *
 * The navigator diffs each group against what it already shows, so handing it
 * the whole group on every change is how it is meant to be driven — there is
 * nothing to add or remove by hand.
 */
export const useDecorationsObserver = (
  navigator: EpubNavigator | null | undefined,
  decorations: DecorationGroups | undefined,
  onDecorationActivated?: (event: DecorationActivatedEvent) => void
) => {
  /** Read by the observer, so a new callback does not re-register it. */
  const onActivatedRef = useRef(onDecorationActivated);
  onActivatedRef.current = onDecorationActivated;

  useDeepCompareEffect(() => {
    if (!navigator || !decorations) return;

    Object.entries(decorations).forEach(([group, list]) => {
      const applicable = list
        .map(toNavigatorDecoration)
        .filter((decoration) => !!decoration);

      navigator.applyDecorations(applicable as any, group);
    });
  }, [navigator, decorations]);

  /**
   * Registered per navigator and per group, and no more often than that.
   *
   * Deep-compared on the group names rather than on `decorations` itself,
   * which the view rebuilds on every render: a plain dependency on it would
   * unregister and register the observer every time anything else in the
   * reader changed.
   */
  useDeepCompareEffect(() => {
    if (!navigator || !decorations) return;

    const observer = {
      onDecorationActivated: (event: any): boolean => {
        const handler = onActivatedRef.current;
        if (!handler) return false;

        handler({
          decoration: {
            id: event.decoration.id,
            locator: event.decoration.locator,
            style: event.decoration.style,
            extras: event.decoration.extras,
          },
          group: event.group,
          // The navigator reports edges; `Rect` is an origin and a size.
          rect: {
            x: event.rect.left,
            y: event.rect.top,
            width: event.rect.width,
            height: event.rect.height,
          },
          point: event.point,
        });

        // Consumed, so the tap does not also turn the page.
        return true;
      },
    };

    Object.keys(decorations).forEach((group) => {
      navigator.registerDecorationObserver(group, observer);
    });

    return () => {
      navigator.unregisterDecorationObserver(observer);
    };
  }, [navigator, Object.keys(decorations ?? {})]);
};

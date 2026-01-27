import { useEffect, useRef } from 'react';
import type { EpubNavigator } from '@readium/navigator';
import type {
  DecorationGroups,
  DecorationActivatedEvent,
} from '../../src/interfaces';
import { useDeepCompareEffect } from 'use-deep-compare';

/**
 * Hook to observe and apply decorations to the navigator
 */
export const useDecorationsObserver = (
  navigator: EpubNavigator | null,
  decorations: DecorationGroups | undefined,
  onDecorationActivated?: (event: DecorationActivatedEvent) => void
) => {
  // Track which groups have had listeners attached
  const activeGroupsRef = useRef<Set<string>>(new Set());

  useDeepCompareEffect(() => {
    if (!navigator || !decorations) {
      return;
    }

    // Check if navigator supports decorations
    // The web navigator (ts-toolkit) doesn't have decoration support yet
    if (typeof (navigator as any).applyDecorations !== 'function') {
      console.warn(
        'Web navigator does not support decorations API yet. Decorations will not be rendered.'
      );
      return;
    }

    // Apply decorations for each group
    Object.entries(decorations).forEach(([group, decorationList]) => {
      // Convert decoration data to navigator format
      const navigatorDecorations = decorationList.map((decoration) => ({
        id: decoration.id,
        locator: decoration.locator,
        style: convertStyle(decoration.style),
        extras: decoration.extras,
      }));

      // Apply decorations to the group
      (navigator as any).applyDecorations(navigatorDecorations, group);

      // Set up listener for this group if not already active
      if (!activeGroupsRef.current.has(group)) {
        activeGroupsRef.current.add(group);

        if (typeof (navigator as any).addDecorationListener === 'function') {
          (navigator as any).addDecorationListener(group, (event: any) => {
            if (onDecorationActivated) {
              onDecorationActivated({
                decoration: {
                  id: event.decoration.id,
                  locator: event.decoration.locator,
                  style: event.decoration.style,
                  extras: event.decoration.extras,
                },
                group: group,
                rect: event.rect,
                point: event.point,
              });
            }
          });
        }
      }
    });
  }, [navigator, decorations, onDecorationActivated]);

  // Clean up listeners when component unmounts
  useEffect(() => {
    return () => {
      if (navigator) {
        activeGroupsRef.current.forEach((group) => {
          // Remove decoration listener for each group
          // Note: This depends on navigator API having a removeDecorationListener method
          // If not available, listeners will be cleaned up when navigator is destroyed
        });
        activeGroupsRef.current.clear();
      }
    };
  }, [navigator]);
};

/**
 * Convert decoration style from TypeScript interface to navigator format
 */
function convertStyle(style: any): any {
  switch (style.type) {
    case 'highlight':
      return {
        type: 'highlight',
        tint: style.tint,
        isActive: style.isActive ?? false,
      };
    case 'underline':
      return {
        type: 'underline',
        tint: style.tint,
        isActive: style.isActive ?? false,
      };
    case 'custom':
      return {
        type: 'custom',
        id: style.id,
        html: style.html,
        css: style.css,
        layout: style.layout ?? 'bounds',
        width: style.width ?? 'wrap',
      };
    default:
      return style;
  }
}

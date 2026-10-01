import type { Locator } from '@readium/shared';

import type { Link, Locator as LocalLocator } from '../../src/interfaces';
import { convertToNavigatorLocator } from './locationNormalizer';

export const sanitizeInitialLocation = (
  initialLocation: Link | LocalLocator | undefined,
  positionsArray: Locator[]
): Locator | undefined => {
  if (!initialLocation) {
    return undefined;
  }

  const normalizedPosition = convertToNavigatorLocator(initialLocation);

  if (!positionsArray.length) {
    return normalizedPosition;
  }

  if (!normalizedPosition) {
    return undefined;
  }

  const positionExists = positionsArray.some(
    (p) => p.locations.position === normalizedPosition.locations.position
  );

  if (positionExists) {
    return normalizedPosition;
  }

  const matchByHref = positionsArray.find(
    (p) => p.href === normalizedPosition.href
  );

  if (matchByHref) {
    return {
      ...matchByHref,
      locations: {
        ...matchByHref.locations,
        progression: normalizedPosition.locations.progression,
      },
    } as Locator;
  }

  return undefined;
};

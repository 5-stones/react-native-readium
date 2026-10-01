import { Locator } from '@readium/shared';
import type { Link, Locator as LocalLocator } from '../../src/interfaces';

/**
 * Normalizes an href by removing leading slashes for consistency across platforms.
 *
 * The Readium toolkit expects hrefs in relative format (e.g., "OPS/main3.xml")
 * rather than absolute format (e.g., "/OPS/main3.xml").
 *
 * @param href - The href to normalize
 * @returns The normalized href without leading slash
 */
export function normalizeHref(href: string): string {
  if (href.startsWith('/')) {
    return href.substring(1);
  }
  return href;
}

/**
 * Normalizes a location object (Link or Locator) by normalizing its href.
 *
 * @param location - The Link or Locator to normalize
 * @returns A new location object with normalized href
 */
export function normalizeLocation<T extends { href: string }>(location: T): T {
  return {
    ...location,
    href: normalizeHref(location.href),
  };
}

/**
 * Converts a Link or Locator to a Readium Locator format suitable for navigation.
 *
 * @param location - The Link or Locator to convert
 * @returns A Locator ready for the Readium navigator, or undefined if invalid
 */
export function convertToNavigatorLocator(
  location: Link | LocalLocator
): Locator | undefined {
  if (!location?.href) return undefined;

  const normalized = normalizeLocation(location);

  return Locator.deserialize({
    ...normalized,
    type: ('type' in normalized && normalized.type) || 'application/xhtml+xml',
  });
}

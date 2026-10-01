import { Preferences } from '../../src/interfaces';

/**
 * Maps PDF preferences into Readium format. Currently no preferences supported so no mapping.
 */
export function mapPdfPreferences(
  preferences: Record<string, any>
): Preferences {
  return preferences;
}

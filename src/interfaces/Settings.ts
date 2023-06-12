import { Appearance, ColumnCount, FontFamily, TextAlignment } from '../enums';

import { clamp, indexOfObjectValue, ranges } from '../utils';

/**
 * A reader settings object with sensible defaults.
 */
export class Settings {
  // TODO:
  // - ligatures
  // - paraIndent
  appearance: Appearance = Appearance.DEFAULT;
  fontFamily: FontFamily = FontFamily.ORIGINAL;
  textAlign: TextAlignment = TextAlignment.JUSTIFY;
  colCount: ColumnCount = ColumnCount.AUTO;

  scroll = false;
  fontOverride = false;
  verticalScroll = false;
  bodyHyphens = false;
  advancedSettings = true;

  /**
   * Range: 100.0 - 300.0
   */
  fontSize = 100;

  /**
   * Range: 0.0 - 0.5
   */
  wordSpacing = 0;

  /**
   * Range: 0.0 - 0.5
   */
  letterSpacing = 0;

  /**
   * Range: 0.5 - 4.0
   */
  pageMargins = 0;

  /**
   * Range: 1.0 - 2.0
   */
  lineHeight = 1;

  /**
   * Range: 0.0 - 2.0
   */
  paragraphMargins?: number = 0;

  static map(settings: Partial<Settings>): Partial<Settings> {
    const defaultValues = new Settings();
    const mapped: Record<string, any> = {};

    Object.keys(defaultValues).forEach((key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      mapped[key] =
        // @ts-expect-error key can't be used to index type 'Partial<Settings>'
        settings[key] !== undefined ? settings[key] : defaultValues[key];
    });

    mapped.appearance = indexOfObjectValue(Appearance, mapped.appearance);
    mapped.fontFamily = indexOfObjectValue(FontFamily, mapped.fontFamily);
    mapped.textAlign = indexOfObjectValue(TextAlignment, mapped.textAlign);
    mapped.colCount = indexOfObjectValue(ColumnCount, mapped.colCount);

    Object.keys(ranges).forEach((key: string) => {
      // @ts-expect-error argument of type `any` assigned to a parameter of type `number`
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      mapped[key] = clamp(mapped[key], ranges[key][0], ranges[key][1]);
    });

    return mapped;
  }
}

import { Appearance, FontFamily, TextAlignment, ColumnCount } from '../enums';

import { RANGES, indexOfObjectValue, clamp } from '../utils';

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

  scroll: boolean = false;
  fontOverride: boolean = false;
  verticalScroll: boolean = false;
  bodyHyphens: boolean = false;
  advancedSettings: boolean = true;

  /**
   * Range: 100.0 - 300.0
   */
  fontSize: number = 100;

  /**
   * Range: 0.0 - 0.5
   */
  wordSpacing: number = 0;

  /**
   * Range: 0.0 - 0.5
   */
  letterSpacing: number = 0;

  /**
   * Range: 0.5 - 4.0
   */
  pageMargins: number = 0;

  /**
   * Range: 1.0 - 2.0
   */
  lineHeight: number = 1;

  /**
   * Range: 0.0 - 2.0
   */
  paragraphMargins?: number = 0;

  static map(settings: Partial<Settings>): any {
    const defaultValues = new Settings();
    const mapped: Record<string, any> = {};

    Object.keys(defaultValues).forEach((key: string) => {
      // @ts-ignore
      mapped[key] =
        settings[key] !== undefined ? settings[key] : defaultValues[key];
    });

    mapped.appearance = indexOfObjectValue(Appearance, mapped.appearance);
    mapped.fontFamily = indexOfObjectValue(FontFamily, mapped.fontFamily);
    mapped.textAlign = indexOfObjectValue(TextAlignment, mapped.textAlign);
    mapped.colCount = indexOfObjectValue(ColumnCount, mapped.colCount);

    Object.keys(RANGES).forEach((key: string) => {
      // @ts-ignore
      mapped[key] = clamp(mapped[key], RANGES[key][0], RANGES[key][1]);
    });

    return mapped;
  }
}

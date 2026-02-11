import type { Preferences as SpecPreferences } from '../specs/ReadiumView.nitro';

/**
 * Preferences with refined string union types for better IDE autocompletion.
 */
export interface Preferences
  extends Omit<
    SpecPreferences,
    | 'columnCount'
    | 'fontFamily'
    | 'imageFilter'
    | 'readingProgression'
    | 'spread'
    | 'textAlign'
    | 'theme'
  > {
  columnCount?: 'auto' | '1' | '2';
  fontFamily?:
    | 'serif'
    | 'sans-serif'
    | 'cursive'
    | 'fantasy'
    | 'monospace'
    | 'AccessibleDfA'
    | 'IA Writer Duospace'
    | 'OpenDyslexic';
  imageFilter?: 'darken' | 'invert';
  readingProgression?: 'ltr' | 'rtl';
  spread?: 'auto' | 'never' | 'always';
  textAlign?: 'center' | 'justify' | 'start' | 'end' | 'left' | 'right';
  theme?: 'light' | 'dark' | 'sepia';
}

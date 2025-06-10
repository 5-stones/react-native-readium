export interface Preferences {
  backgroundColor?: number;
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
  fontSize?: number;
  fontWeight?: number;
  hyphens?: boolean;
  imageFilter?: 'darken' | 'invert';
  language?: string;
  letterSpacing?: number;
  ligatures?: boolean;
  lineHeight?: number;
  pageMargins?: number;
  paragraphIndent?: number;
  paragraphSpacing?: number;
  publisherStyles?: boolean;
  readingProgression?: 'ltr' | 'rtl';
  scroll?: boolean;
  spread?: 'auto' | 'never' | 'always';
  textAlign?: 'center' | 'justify' | 'start' | 'end' | 'left' | 'right';
  textColor?: number;
  textNormalization?: boolean;
  theme?: 'light' | 'dark' | 'sepia';
  typeScale?: number;
  verticalText?: boolean;
  wordSpacing?: number;
}

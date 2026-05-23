import { Platform } from 'react-native';

/**
 * Design tokens — a small, modern-minimal system shared across the example app.
 * Keep the surface small: colors, typography, spacing, radii, shadows.
 */

export const palette = {
  // Surfaces
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F2EE',
  surfaceSunken: '#EEEDE7',

  // Borders
  border: '#E7E5DF',
  borderStrong: '#D4D2CB',

  // Text
  textPrimary: '#15140F',
  textSecondary: '#56544D',
  textTertiary: '#8A877E',
  textInverse: '#FFFFFF',

  // Accents
  accent: '#15140F',
  accentMuted: '#2A2823',
  link: '#2A5BD7',
  linkSoft: '#E8EEFC',

  // Semantic
  destructive: '#C53030',
  destructiveSoft: '#FBE8E8',
  success: '#1F7A4D',
  warning: '#B5651D',
};

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

export const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
});

export const fontFamilySerif = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
});

export const typography = {
  display: {
    fontFamily: fontFamilySerif,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: palette.textPrimary,
  },
  title: {
    fontFamily,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    color: palette.textPrimary,
  },
  subtitle: {
    fontFamily,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as const,
    color: palette.textPrimary,
  },
  body: {
    fontFamily,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400' as const,
    color: palette.textPrimary,
  },
  bodyStrong: {
    fontFamily,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600' as const,
    color: palette.textPrimary,
  },
  small: {
    fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
    color: palette.textSecondary,
  },
  caption: {
    fontFamily,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    color: palette.textTertiary,
    textTransform: 'uppercase' as const,
  },
};

export const shadow = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 2,
    },
    android: { elevation: 1 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
    },
    android: { elevation: 3 },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 24,
    },
    android: { elevation: 8 },
    default: {},
  }),
};

export const theme = {
  palette,
  radii,
  space,
  typography,
  shadow,
  fontFamily,
  fontFamilySerif,
};

export type Theme = typeof theme;

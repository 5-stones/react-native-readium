import { StyleSheet } from 'react-native';
import { palette, radii, space, typography } from './theme';

/**
 * Shared styles for modal components — built on the design tokens in `theme.ts`.
 * The exported `colors` shape is kept stable for backward-compat across components.
 */
export const modalStyles = StyleSheet.create({
  cardItem: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: palette.border,
  },

  cardItemLast: {
    marginBottom: 0,
  },

  sectionTitle: {
    ...typography.caption,
    color: palette.textTertiary,
    marginBottom: space.sm,
  },

  emptyText: {
    ...typography.body,
    color: palette.textTertiary,
    textAlign: 'center',
    paddingVertical: space.xxl,
  },

  actionButton: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radii.sm,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.border,
  },

  destructiveButton: {
    backgroundColor: palette.destructiveSoft,
    borderColor: palette.destructiveSoft,
  },

  actionButtonText: {
    fontSize: 13,
    color: palette.textPrimary,
    fontWeight: '600',
  },

  textInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    padding: space.md,
    fontSize: 15,
    color: palette.textPrimary,
    backgroundColor: palette.surface,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  section: {
    marginBottom: space.xl,
  },

  selectedText: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.textSecondary,
    fontStyle: 'italic',
    padding: space.md,
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.sm,
    borderLeftWidth: 3,
    borderLeftColor: palette.borderStrong,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.md,
  },

  button: {
    flex: 1,
    paddingVertical: space.sm + 2,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },

  cancelButton: {
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cancelButtonText: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },

  confirmButton: {
    backgroundColor: palette.accent,
  },

  saveButton: {
    backgroundColor: palette.accent,
  },

  deleteButton: {
    backgroundColor: palette.destructive,
  },

  buttonText: {
    color: palette.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
});

/**
 * Backward-compatible color shape — values now come from the central palette.
 */
export const colors = {
  primary: palette.accent,
  destructive: palette.destructive,
  success: palette.success,
  text: {
    primary: palette.textPrimary,
    secondary: palette.textSecondary,
    tertiary: palette.textTertiary,
  },
  background: {
    card: palette.surface,
    input: palette.surface,
  },
  border: {
    primary: palette.border,
    secondary: palette.border,
    tertiary: palette.borderStrong,
  },
};

/**
 * Highlight color options — softer, paper-friendly tones.
 */
export const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#FFE58A' },
  { name: 'Green', value: '#B7E4C7' },
  { name: 'Blue', value: '#BBDEFB' },
  { name: 'Pink', value: '#F8BBD0' },
  { name: 'Orange', value: '#FFCC80' },
  { name: 'Purple', value: '#D1C4E9' },
];

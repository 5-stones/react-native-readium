import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReadiumProps } from 'react-native-readium';
import { RANGES } from 'react-native-readium';
import { ReaderButton } from './ReaderButton';
import { BaseModal } from './BaseModal';
import { modalStyles } from '../styles/modal';
import { palette, radii, space, typography } from '../styles/theme';

interface Props {
  preferences: ReadiumProps['preferences'];
  onChange: (preferences: ReadiumProps['preferences']) => void;
}

type Theme = NonNullable<ReadiumProps['preferences']['theme']>;

const THEMES: Array<{ value: Theme; label: string; icon: string }> = [
  { value: 'light', label: 'Light', icon: 'wb-sunny' },
  { value: 'sepia', label: 'Sepia', icon: 'local-cafe' },
  { value: 'dark', label: 'Dark', icon: 'nights-stay' },
];

export const PreferencesEditor = ({ preferences, onChange }: Props) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleThemeChange = useCallback(
    (theme: Theme) => {
      onChange({ ...preferences, theme });
    },
    [preferences, onChange]
  );

  const handleFontSizeChange = (fontSize: number) => {
    onChange({
      ...preferences,
      fontSize,
      typeScale: fontSize,
    });
  };

  const handlePageMarginsChange = (pageMargins: number) => {
    onChange({
      ...preferences,
      pageMargins,
    });
  };

  const activeTheme = preferences.theme || 'light';

  return (
    <>
      <ReaderButton size={22} name="tune" onPress={() => setIsOpen(true)} />

      <BaseModal
        visible={isOpen}
        title="Reading Settings"
        onClose={() => setIsOpen(false)}
      >
        <Text style={styles.sectionLabel}>Theme</Text>
        <View style={styles.themeGroup}>
          {THEMES.map((t) => {
            const active = activeTheme === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                style={[styles.themeOption, active && styles.themeOptionActive]}
                onPress={() => handleThemeChange(t.value)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={t.icon}
                  size={20}
                  color={
                    active ? palette.textInverse : palette.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.themeLabel,
                    active && styles.themeLabelActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Font Size</Text>
        <View style={modalStyles.cardItem}>
          <View style={styles.settingHeader}>
            <Text style={styles.aA}>A</Text>
            <Text style={styles.value}>
              {preferences.fontSize?.toFixed(1) || '1.0'}
            </Text>
            <Text style={[styles.aA, styles.aALarge]}>A</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={RANGES.fontSize[0]}
            maximumValue={RANGES.fontSize[1]}
            step={0.1}
            value={preferences.fontSize}
            onSlidingComplete={handleFontSizeChange}
            minimumTrackTintColor={palette.accent}
            maximumTrackTintColor={palette.border}
            thumbTintColor={palette.accent}
          />
        </View>

        <Text style={styles.sectionLabel}>Page Margins</Text>
        <View style={modalStyles.cardItem}>
          <View style={styles.settingHeader}>
            <MaterialIcons
              name="format-indent-decrease"
              size={18}
              color={palette.textTertiary}
            />
            <Text style={styles.value}>{preferences.pageMargins || 0}</Text>
            <MaterialIcons
              name="format-indent-increase"
              size={18}
              color={palette.textTertiary}
            />
          </View>
          <Slider
            style={styles.slider}
            minimumValue={RANGES.pageMargins[0]}
            maximumValue={RANGES.pageMargins[1]}
            step={1}
            value={preferences.pageMargins}
            onSlidingComplete={handlePageMarginsChange}
            minimumTrackTintColor={palette.accent}
            maximumTrackTintColor={palette.border}
            thumbTintColor={palette.accent}
          />
        </View>
      </BaseModal>
    </>
  );
};

const styles = StyleSheet.create({
  sectionLabel: {
    ...typography.caption,
    marginTop: space.sm,
    marginBottom: space.sm,
  },
  themeGroup: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.lg,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingVertical: space.md,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  themeOptionActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  themeLabelActive: {
    color: palette.textInverse,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  aA: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textTertiary,
  },
  aALarge: {
    fontSize: 20,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  slider: {
    width: '100%',
    height: 36,
  },
});

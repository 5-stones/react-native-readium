import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import type { ReadiumProps, Capabilities } from 'react-native-readium';
import { RANGES } from 'react-native-readium';
import { ReaderButton } from './ReaderButton';
import { BaseModal } from './BaseModal';
import { colors } from '../styles/modal';

interface Props {
  preferences: ReadiumProps['preferences'];
  onChange: (preferences: ReadiumProps['preferences']) => void;
  capabilities?: Capabilities;
}

type Theme = NonNullable<ReadiumProps['preferences']['theme']>;

const THEME_LABELS: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  sepia: 'Sepia',
};

enum FIT {
  cover = 'cover',
  contain = 'contain',
  width = 'width',
  height = 'height',
}

type Spread = 'auto' | 'never' | 'always';

export const PreferencesEditor = ({
  preferences,
  onChange,
  capabilities,
}: Props) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const nextAppearance = useCallback((theme?: Theme) => {
    if (theme === 'light') {
      return 'dark';
    } else if (theme === 'dark') {
      return 'sepia';
    } else {
      return 'light';
    }
  }, []);

  const handleThemeChange = () => {
    onChange({
      ...preferences,
      theme: nextAppearance(preferences.theme),
    });
  };

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

  const nextFit = useCallback((fit?: 'cover' | 'contain' | 'width' | 'height') => {
    if (fit === FIT.contain) {
      return FIT.cover;
    } else if (fit === FIT.cover) {
      return FIT.height;
    } else if (fit === FIT.height) {
      return FIT.width;
    } else {
      return FIT.contain;
    }
  }, []);

  const handleFitChange = () => {
    onChange({
      ...preferences,
      fit: nextFit(preferences.fit),
    });
  };

  const nextSpread = useCallback((spread?: Spread): Spread => {
    if (spread === 'auto') {
      return 'never';
    } else if (spread === 'never') {
      return 'always';
    } else {
      return 'auto';
    }
  }, []);

  const handleSpreadChange = () => {
    onChange({
      ...preferences,
      spread: nextSpread(preferences.spread),
    });
  };

  type ColumnCount = 'auto' | '1' | '2';

  const nextColumnCount = useCallback((columnCount?: ColumnCount ): ColumnCount => {
    if (columnCount === 'auto') {
      return '1';
    } else if (columnCount === '1') {
      return '2';
    } else {
      return 'auto';
    }
  }, []);

  const handleColumnCountChange = () => {
    onChange({
      ...preferences,
      columnCount: nextColumnCount(preferences.columnCount),
    });
  };

  const handleScrollChange = () => {
    onChange({
      ...preferences,
      scroll: !preferences.scroll,
    })
  }

  const handleScrollAxisChange = () => {
    onChange({
      ...preferences,
      scrollAxis: preferences.scrollAxis === "vertical" ? "horizontal" : "vertical",
    })
  }

  return (
    <>
      <ReaderButton size={35} name="settings" onPress={() => setIsOpen(true)} />

      <BaseModal
        visible={isOpen}
        title="Reader Settings"
        onClose={() => setIsOpen(false)}
      >
        {/* Theme Setting */}
        {capabilities?.theme && (
          <View>
            <View style={styles.settingHeader}>
              <Text style={styles.settingLabel}>Theme</Text>
              <TouchableOpacity
                style={styles.themeButton}
                onPress={handleThemeChange}
                activeOpacity={0.7}
              >
                <Text style={styles.themeButtonText}>
                  {THEME_LABELS[preferences.theme || 'light']}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.settingDescription}>
              Change the reading theme appearance
            </Text>
          </View>
        )}

        {/* Font Size Setting */}
        {capabilities?.fontSize && (
          <View>
            <View style={styles.settingHeader}>
              <Text style={styles.settingLabel}>Font Size</Text>
              <Text style={styles.settingValue}>
                {preferences.fontSize?.toFixed(1) || '1.0'}
              </Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={RANGES.fontSize[0]}
              maximumValue={RANGES.fontSize[1]}
              step={0.1}
              value={preferences.fontSize}
              onSlidingComplete={handleFontSizeChange}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border.secondary}
              thumbTintColor={colors.primary}
            />
            <View style={styles.rangeLabels}>
              <Text style={styles.rangeLabel}>Small</Text>
              <Text style={styles.rangeLabel}>Large</Text>
            </View>
          </View>
        )}

        {/* Page Margin Setting */}
        {capabilities?.pageMargins && (
          <View>
            <View style={styles.settingHeader}>
              <Text style={styles.settingLabel}>Page Margin</Text>
              <Text style={styles.settingValue}>
                {preferences.pageMargins || 0}
              </Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={RANGES.pageMargins[0]}
              maximumValue={RANGES.pageMargins[1]}
              step={1}
              value={preferences.pageMargins}
              onSlidingComplete={handlePageMarginsChange}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border.secondary}
              thumbTintColor={colors.primary}
            />
            <View style={styles.rangeLabels}>
              <Text style={styles.rangeLabel}>Narrow</Text>
              <Text style={styles.rangeLabel}>Wide</Text>
            </View>
          </View>
        )}

        {/* Fit Setting */}
        {capabilities?.fit && (
          <View>
            <View style={styles.settingHeader}>
              <Text style={styles.settingLabel}>Fit</Text>
              <TouchableOpacity
                style={styles.themeButton}
                onPress={handleFitChange}
                activeOpacity={0.7}
              >
                <Text style={styles.themeButtonText}>
                  {preferences.fit?.toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.settingDescription}>
              Change the fit
            </Text>
          </View>
        )}

        {/* Spread Setting */}
        {capabilities?.spread && (
          <View>
            <View style={styles.settingHeader}>
              <Text style={styles.settingLabel}>Spread</Text>
              <TouchableOpacity
                style={styles.themeButton}
                onPress={handleSpreadChange}
                activeOpacity={0.7}
              >
                <Text style={styles.themeButtonText}>
                  {preferences.spread?.toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.settingDescription}>
              Change the spread
            </Text>
          </View>
        )}

        {/* Column Count setting */}
        {capabilities?.columnCount && (
          <View>
            <View style={styles.settingHeader}>
              <Text style={styles.settingLabel}>Column Count</Text>
              <TouchableOpacity
                style={styles.themeButton}
                onPress={handleColumnCountChange}
                activeOpacity={0.7}
              >
                <Text style={styles.themeButtonText}>
                  {preferences.columnCount}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.settingDescription}>
              Change the column count
            </Text>
          </View>
        )}

        {/* Scroll Setting */}
        {capabilities?.scroll && (
          <View>
            <View style={styles.settingHeader}>
              <Text style={styles.settingLabel}>Scroll</Text>
              <TouchableOpacity
                style={styles.themeButton}
                onPress={handleScrollChange}
                activeOpacity={0.7}
              >
                <Text style={styles.themeButtonText}>
                  {preferences.scroll ? "Scrolling" : "Paginated"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.settingDescription}>
              Scroll or Paginate
            </Text>
          </View>
        )}

        {capabilities?.scrollAxis && (
          <View>
            <View style={styles.settingHeader}>
              <Text style={styles.settingLabel}>Scroll Axis</Text>
              <TouchableOpacity
                style={styles.themeButton}
                onPress={handleScrollAxisChange}
                activeOpacity={0.7}
              >
                <Text style={styles.themeButtonText}>
                  {preferences.scrollAxis}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.settingDescription}>
              Scroll or Paginate
            </Text>
          </View>
        )}
      </BaseModal>
    </>
  );
};

const styles = StyleSheet.create({
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  settingValue: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.primary,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 4,
  },
  themeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  themeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
    marginVertical: 8,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rangeLabel: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
});

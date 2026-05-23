import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import ReanimatedColorPicker, {
  Panel1,
  HueSlider,
  Preview,
  type ColorFormatsObject,
} from 'reanimated-color-picker';

import { HIGHLIGHT_COLORS } from '../../styles/modal';
import { palette, radii, space, typography } from '../../styles/theme';

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

const isPresetColor = (color: string) =>
  HIGHLIGHT_COLORS.some(
    (c) => c.value.toLowerCase() === color.toLowerCase()
  );

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onColorSelect,
}) => {
  const initialIsCustom = useMemo(
    () => !isPresetColor(selectedColor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [customExpanded, setCustomExpanded] = useState(initialIsCustom);

  useEffect(() => {
    if (!isPresetColor(selectedColor) && !customExpanded) {
      setCustomExpanded(true);
    }
  }, [selectedColor, customExpanded]);

  const handlePresetSelect = (value: string) => {
    setCustomExpanded(false);
    onColorSelect(value);
  };

  const handleCustomToggle = () => {
    if (customExpanded) {
      setCustomExpanded(false);
      return;
    }
    setCustomExpanded(true);
    if (isPresetColor(selectedColor)) {
      onColorSelect('#FF6B6B');
    }
  };

  const onPickerComplete = useCallback(
    (colors: ColorFormatsObject) => {
      onColorSelect(colors.hex.toUpperCase());
    },
    [onColorSelect]
  );

  const customIsActive = customExpanded && !isPresetColor(selectedColor);

  return (
    <View>
      <View style={styles.colorGrid}>
        {HIGHLIGHT_COLORS.map((color) => {
          const selected =
            !customIsActive &&
            selectedColor.toLowerCase() === color.value.toLowerCase();
          return (
            <TouchableOpacity
              key={color.value}
              accessibilityLabel={`${color.name} highlight`}
              style={[
                styles.colorButton,
                { backgroundColor: color.value },
                selected && styles.colorButtonSelected,
              ]}
              onPress={() => handlePresetSelect(color.value)}
              activeOpacity={0.8}
            >
              {selected ? (
                <MaterialIcons
                  name="check"
                  size={18}
                  color={palette.textPrimary}
                />
              ) : null}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          accessibilityLabel="Custom highlight color"
          style={[
            styles.colorButton,
            styles.customButton,
            customIsActive && styles.colorButtonSelected,
            customIsActive ? { backgroundColor: selectedColor } : null,
          ]}
          onPress={handleCustomToggle}
          activeOpacity={0.8}
        >
          {customIsActive ? (
            <MaterialIcons
              name="check"
              size={18}
              color={palette.textPrimary}
            />
          ) : (
            <MaterialIcons
              name="colorize"
              size={18}
              color={palette.textSecondary}
            />
          )}
        </TouchableOpacity>
      </View>

      {customExpanded ? (
        <View style={styles.pickerCard}>
          <ReanimatedColorPicker
            value={isPresetColor(selectedColor) ? '#FF6B6B' : selectedColor}
            onCompleteJS={onPickerComplete}
            sliderThickness={18}
            thumbSize={22}
            thumbShape="ring"
            style={styles.picker}
          >
            <Preview
              hideInitialColor
              hideText
              style={styles.preview}
            />
            <Panel1 style={styles.panel} />
            <HueSlider style={styles.hue} />
          </ReanimatedColorPicker>

          <View style={styles.hexRow}>
            <Text style={styles.hexLabel}>HEX</Text>
            <Text style={styles.hexValue}>
              {customIsActive ? selectedColor.toUpperCase() : '—'}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  colorButtonSelected: {
    borderColor: palette.accent,
    borderWidth: 2,
  },
  customButton: {
    backgroundColor: palette.surface,
    borderStyle: 'dashed',
  },
  pickerCard: {
    marginTop: space.md,
    padding: space.md,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    gap: space.md,
  },
  picker: {
    width: '100%',
    gap: space.sm,
  },
  preview: {
    height: 32,
    borderRadius: radii.sm,
  },
  panel: {
    height: 160,
    borderRadius: radii.sm,
  },
  hue: {
    borderRadius: radii.pill,
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  hexLabel: {
    ...typography.caption,
    color: palette.textTertiary,
  },
  hexValue: {
    ...typography.bodyStrong,
    color: palette.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { HIGHLIGHT_COLORS, colors } from '../../styles/modal';

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onColorSelect,
}) => {
  return (
    <View style={styles.colorGrid}>
      {HIGHLIGHT_COLORS.map((color) => (
        <TouchableOpacity
          key={color.value}
          style={[
            styles.colorButton,
            { backgroundColor: color.value },
            selectedColor === color.value && styles.colorButtonSelected,
          ]}
          onPress={() => onColorSelect(color.value)}
        >
          <Text style={styles.colorName}>{color.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 80,
    alignItems: 'center',
  },
  colorButtonSelected: {
    borderColor: '#000',
    borderWidth: 3,
  },
  colorName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
});

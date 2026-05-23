import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { Locator } from 'react-native-readium';
import { BaseModal } from '../BaseModal';
import { ColorPicker } from './ColorPicker';
import { modalStyles, HIGHLIGHT_COLORS } from '../../styles/modal';
import { palette, space, typography } from '../../styles/theme';

interface HighlightColorPickerProps {
  visible: boolean;
  locator: Locator | null;
  selectedText: string;
  onConfirm: (color: string, note: string) => void;
  onCancel: () => void;
}

export const HighlightColorPicker: React.FC<HighlightColorPickerProps> = ({
  visible,
  locator,
  selectedText,
  onConfirm,
  onCancel,
}) => {
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].value);
  const [note, setNote] = useState('');

  const handleConfirm = () => {
    onConfirm(selectedColor, note);
    setSelectedColor(HIGHLIGHT_COLORS[0].value);
    setNote('');
  };

  const handleCancel = () => {
    onCancel();
    setSelectedColor(HIGHLIGHT_COLORS[0].value);
    setNote('');
  };

  if (!locator) {
    return null;
  }

  return (
    <BaseModal
      visible={visible}
      title="New Highlight"
      onClose={handleCancel}
      footer={
        <View style={modalStyles.buttonRow}>
          <TouchableOpacity
            style={[modalStyles.button, modalStyles.cancelButton]}
            onPress={handleCancel}
          >
            <Text style={modalStyles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[modalStyles.button, modalStyles.confirmButton]}
            onPress={handleConfirm}
          >
            <Text style={modalStyles.buttonText}>Save</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <Text style={modalStyles.sectionTitle}>Excerpt</Text>
      <View
        style={[
          styles.excerpt,
          { borderLeftColor: selectedColor },
        ]}
      >
        <Text style={styles.excerptText} numberOfLines={4}>
          {selectedText}
        </Text>
      </View>

      <Text style={modalStyles.sectionTitle}>Color</Text>
      <ColorPicker
        selectedColor={selectedColor}
        onColorSelect={setSelectedColor}
      />

      <Text style={[modalStyles.sectionTitle, { marginTop: space.xl }]}>
        Note
      </Text>
      <TextInput
        style={modalStyles.textInput}
        value={note}
        onChangeText={setNote}
        placeholder="Add a note (optional)…"
        placeholderTextColor={palette.textTertiary}
        multiline
        numberOfLines={3}
      />

    </BaseModal>
  );
};

const styles = StyleSheet.create({
  excerpt: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: palette.border,
    padding: space.md,
    marginBottom: space.xl,
  },
  excerptText: {
    ...typography.body,
    color: palette.textSecondary,
    fontStyle: 'italic',
    lineHeight: 22,
  },
});

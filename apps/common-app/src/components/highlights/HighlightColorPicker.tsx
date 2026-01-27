import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import type { Locator } from 'react-native-readium';
import { BaseModal } from '../BaseModal';
import { ColorPicker } from './ColorPicker';
import { modalStyles, HIGHLIGHT_COLORS } from '../../styles/modal';

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
    // Reset state
    setSelectedColor(HIGHLIGHT_COLORS[0].value);
    setNote('');
  };

  const handleCancel = () => {
    onCancel();
    // Reset state
    setSelectedColor(HIGHLIGHT_COLORS[0].value);
    setNote('');
  };

  if (!locator) {
    return null;
  }

  return (
    <BaseModal
      visible={visible}
      title="Create Highlight"
      onClose={handleCancel}
    >
      <View style={modalStyles.section}>
        <Text style={modalStyles.sectionTitle}>Selected Text:</Text>
        <Text style={modalStyles.selectedText} numberOfLines={3}>
          {selectedText}
        </Text>
      </View>

      <View style={modalStyles.section}>
        <Text style={modalStyles.sectionTitle}>Choose Color:</Text>
        <ColorPicker
          selectedColor={selectedColor}
          onColorSelect={setSelectedColor}
        />
      </View>

      <View style={modalStyles.section}>
        <Text style={modalStyles.sectionTitle}>Add Note (optional):</Text>
        <TextInput
          style={modalStyles.textInput}
          value={note}
          onChangeText={setNote}
          placeholder="Enter your note here..."
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={modalStyles.buttonRow}>
        <TouchableOpacity
          style={[modalStyles.button, modalStyles.cancelButton]}
          onPress={handleCancel}
        >
          <Text style={modalStyles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[modalStyles.button, modalStyles.confirmButton]}
          onPress={handleConfirm}
        >
          <Text style={modalStyles.buttonText}>Create Highlight</Text>
        </TouchableOpacity>
      </View>
    </BaseModal>
  );
};

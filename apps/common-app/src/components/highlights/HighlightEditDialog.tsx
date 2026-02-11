import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import type { Decoration } from 'react-native-readium';
import { BaseModal } from '../BaseModal';
import { ColorPicker } from './ColorPicker';
import { modalStyles, HIGHLIGHT_COLORS } from '../../styles/modal';
import { showConfirmDialog } from '../../utils/dialogUtils';

interface HighlightEditDialogProps {
  visible: boolean;
  highlight: Decoration | null;
  onUpdate: (id: string, color: string, note: string) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}

// Check if style has a tint property
const hasTint = (style: Decoration['style']): boolean => {
  return style.tint !== undefined;
};

export const HighlightEditDialog: React.FC<HighlightEditDialogProps> = ({
  visible,
  highlight,
  onUpdate,
  onDelete,
  onCancel,
}) => {
  const getTint = () => {
    if (highlight && hasTint(highlight.style)) {
      return highlight.style.tint!;
    }
    return HIGHLIGHT_COLORS[0].value;
  };

  const [selectedColor, setSelectedColor] = useState(getTint());
  const [note, setNote] = useState(highlight?.extras?.note || '');

  // Update state when highlight changes
  useEffect(() => {
    if (highlight) {
      setSelectedColor(getTint());
      setNote(highlight.extras?.note || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight]);

  const handleUpdate = () => {
    if (!highlight) return;
    onUpdate(highlight.id, selectedColor, note);
  };

  const handleDelete = () => {
    if (!highlight) return;
    showConfirmDialog(
      'Delete Highlight',
      'Are you sure you want to delete this highlight?',
      () => onDelete(highlight.id)
    );
  };

  if (!highlight) {
    return null;
  }

  const selectedText = highlight.extras?.selectedText || '';

  return (
    <BaseModal visible={visible} title="Edit Highlight" onClose={onCancel}>
      {selectedText ? (
        <View style={modalStyles.section}>
          <Text style={modalStyles.sectionTitle}>Highlighted Text:</Text>
          <Text style={modalStyles.selectedText} numberOfLines={3}>
            {selectedText}
          </Text>
        </View>
      ) : null}

      <View style={modalStyles.section}>
        <Text style={modalStyles.sectionTitle}>Color:</Text>
        <ColorPicker
          selectedColor={selectedColor}
          onColorSelect={setSelectedColor}
        />
      </View>

      <View style={modalStyles.section}>
        <Text style={modalStyles.sectionTitle}>Note:</Text>
        <TextInput
          style={modalStyles.textInput}
          value={note}
          onChangeText={setNote}
          placeholder="Add a note (optional)..."
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={modalStyles.buttonRow}>
        <TouchableOpacity
          style={[modalStyles.button, modalStyles.deleteButton]}
          onPress={handleDelete}
        >
          <Text style={modalStyles.buttonText}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[modalStyles.button, modalStyles.cancelButton]}
          onPress={onCancel}
        >
          <Text style={modalStyles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[modalStyles.button, modalStyles.saveButton]}
          onPress={handleUpdate}
        >
          <Text style={modalStyles.buttonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </BaseModal>
  );
};

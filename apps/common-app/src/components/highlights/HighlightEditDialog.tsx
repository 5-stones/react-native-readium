import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { Decoration } from 'react-native-readium';
import { BaseModal } from '../BaseModal';
import { ColorPicker } from './ColorPicker';
import { modalStyles, HIGHLIGHT_COLORS } from '../../styles/modal';
import { palette, space, typography } from '../../styles/theme';
import { showConfirmDialog } from '../../utils/dialogUtils';

interface HighlightEditDialogProps {
  visible: boolean;
  highlight: Decoration | null;
  onUpdate: (id: string, color: string, note: string) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}

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
    <BaseModal
      visible={visible}
      title="Edit Highlight"
      onClose={onCancel}
      footer={
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
            <Text style={modalStyles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[modalStyles.button, modalStyles.saveButton]}
            onPress={handleUpdate}
          >
            <Text style={modalStyles.buttonText}>Save</Text>
          </TouchableOpacity>
        </View>
      }
    >
      {selectedText ? (
        <>
          <Text style={modalStyles.sectionTitle}>Excerpt</Text>
          <View
            style={[styles.excerpt, { borderLeftColor: selectedColor }]}
          >
            <Text style={styles.excerptText} numberOfLines={4}>
              {selectedText}
            </Text>
          </View>
        </>
      ) : null}

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

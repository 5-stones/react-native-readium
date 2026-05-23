import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { Decoration, Locator } from 'react-native-readium';
import { ReaderButton } from '../ReaderButton';
import { BaseModal } from '../BaseModal';
import { modalStyles } from '../../styles/modal';
import { palette, radii, space, typography } from '../../styles/theme';
import { showConfirmDialog } from '../../utils/dialogUtils';

interface HighlightManagerProps {
  highlights: Decoration[];
  onDeleteHighlight: (id: string) => void;
  onNavigateToHighlight: (locator: Locator) => void;
  onEditHighlight: (highlight: Decoration) => void;
}

export const HighlightManager: React.FC<HighlightManagerProps> = ({
  highlights,
  onDeleteHighlight,
  onNavigateToHighlight,
  onEditHighlight,
}) => {
  const [visible, setVisible] = useState(false);

  const handleDeleteHighlight = (id: string) => {
    showConfirmDialog(
      'Delete Highlight',
      'Are you sure you want to delete this highlight?',
      () => onDeleteHighlight(id)
    );
  };

  return (
    <>
      <ReaderButton
        size={22}
        name="edit"
        onPress={() => setVisible(true)}
      />

      <BaseModal
        visible={visible}
        title="Highlights"
        onClose={() => setVisible(false)}
      >
        <Text style={modalStyles.sectionTitle}>
          Saved · {highlights.length}
        </Text>
        {highlights.length === 0 ? (
          <Text style={modalStyles.emptyText}>
            No highlights yet. Long-press text in the reader to create one.
          </Text>
        ) : (
          highlights.map((highlight) => (
            <View key={highlight.id} style={modalStyles.cardItem}>
              <View style={styles.header}>
                <View
                  style={[
                    styles.colorIndicator,
                    {
                      backgroundColor:
                        highlight.style.type === 'highlight'
                          ? highlight.style.tint
                          : palette.borderStrong,
                    },
                  ]}
                />
                <Text style={styles.location} numberOfLines={2}>
                  {highlight.extras?.selectedText ||
                    highlight.locator.title ||
                    highlight.locator.href}
                </Text>
              </View>

              {highlight.extras?.note ? (
                <View style={styles.note}>
                  <MaterialIcons
                    name="sticky-note-2"
                    size={14}
                    color={palette.textTertiary}
                  />
                  <Text style={styles.noteText}>{highlight.extras.note}</Text>
                </View>
              ) : null}

              {highlight.extras?.createdAt ? (
                <Text style={styles.timestamp}>
                  {new Date(highlight.extras.createdAt).toLocaleDateString()}
                </Text>
              ) : null}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={modalStyles.actionButton}
                  onPress={() => onNavigateToHighlight(highlight.locator)}
                >
                  <Text style={modalStyles.actionButtonText}>Go to</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={modalStyles.actionButton}
                  onPress={() => {
                    setVisible(false);
                    onEditHighlight(highlight);
                  }}
                >
                  <Text style={modalStyles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    modalStyles.actionButton,
                    modalStyles.destructiveButton,
                  ]}
                  onPress={() => handleDeleteHighlight(highlight.id)}
                >
                  <Text
                    style={[
                      modalStyles.actionButtonText,
                      { color: palette.destructive },
                    ]}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </BaseModal>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    marginBottom: space.sm,
  },
  colorIndicator: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    minHeight: 24,
  },
  location: {
    flex: 1,
    ...typography.body,
    color: palette.textPrimary,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.xs,
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.sm,
    padding: space.sm,
    marginTop: space.xs,
  },
  noteText: {
    flex: 1,
    ...typography.small,
    color: palette.textSecondary,
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: 11,
    color: palette.textTertiary,
    marginTop: space.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.md,
  },
});

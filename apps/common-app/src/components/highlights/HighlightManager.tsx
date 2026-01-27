import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Decoration, Locator } from 'react-native-readium';
import { ReaderButton } from '../ReaderButton';
import { BaseModal } from '../BaseModal';
import { modalStyles, colors } from '../../styles/modal';
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
        size={35}
        name="bookmark"
        onPress={() => setVisible(true)}
      />

      <BaseModal
        visible={visible}
        title="Highlights"
        onClose={() => setVisible(false)}
      >
        <View style={styles.section}>
          <Text style={modalStyles.sectionTitle}>
            Your Highlights ({highlights.length})
          </Text>
          {highlights.length === 0 ? (
            <Text style={modalStyles.emptyText}>No highlights yet.</Text>
          ) : (
            highlights.map((highlight) => (
              <View key={highlight.id} style={modalStyles.cardItem}>
                <View style={styles.highlightHeader}>
                  <View
                    style={[
                      styles.colorIndicator,
                      {
                        backgroundColor:
                          highlight.style.type === 'highlight'
                            ? highlight.style.tint
                            : '#CCCCCC',
                      },
                    ]}
                  />
                  <Text style={styles.highlightLocation} numberOfLines={1}>
                    {highlight.extras?.selectedText ||
                      highlight.locator.title ||
                      highlight.locator.href}
                  </Text>
                </View>

                {highlight.extras?.note && (
                  <Text style={styles.highlightNote}>
                    {highlight.extras.note}
                  </Text>
                )}
                <View style={styles.highlightActions}>
                  <TouchableOpacity
                    style={modalStyles.actionButton}
                    onPress={() => onNavigateToHighlight(highlight.locator)}
                  >
                    <Text style={modalStyles.actionButtonText}>Go To</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={modalStyles.actionButton}
                    onPress={() => {
                      setVisible(false); // Close this modal first
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
                    <Text style={modalStyles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>

                {highlight.extras?.createdAt && (
                  <Text style={styles.timestamp}>
                    {new Date(highlight.extras.createdAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      </BaseModal>
    </>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 30,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border.tertiary,
  },
  highlightLocation: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  highlightNote: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  highlightActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  timestamp: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 8,
  },
});

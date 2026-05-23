import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { Locator } from 'react-native-readium';

import { ReaderButton } from './ReaderButton';
import { BaseModal } from './BaseModal';
import { modalStyles } from '../styles/modal';
import { palette, radii, space, typography } from '../styles/theme';
import { showConfirmDialog } from '../utils/dialogUtils';
import type { Bookmark } from '../types/reader.types';

interface BookmarkManagerProps {
  bookmarks: Bookmark[];
  isLoading: boolean;
  error: Error | null;
  currentLocation?: Locator;
  isCurrentBookmarked: boolean;
  onAddBookmark: (locator: Locator) => void;
  onDeleteBookmark: (id: string) => void;
  onNavigateToBookmark: (locator: Locator) => void;
}

const previewText = (locator: Locator) =>
  locator.text?.highlight?.trim() ||
  locator.title ||
  locator.href.split('/').pop() ||
  locator.href;

const subtitle = (locator: Locator) => {
  const total = locator.locations?.totalProgression;
  const chapter = locator.title || locator.href.split('/').pop();
  if (total != null) {
    return `${chapter} · ${Math.round(total * 100)}%`;
  }
  return chapter ?? '';
};

export const BookmarkManager: React.FC<BookmarkManagerProps> = ({
  bookmarks,
  isLoading,
  error,
  currentLocation,
  isCurrentBookmarked,
  onAddBookmark,
  onDeleteBookmark,
  onNavigateToBookmark,
}) => {
  const [visible, setVisible] = useState(false);

  const handleDelete = (id: string) => {
    showConfirmDialog(
      'Delete Bookmark',
      'Remove this bookmark?',
      () => onDeleteBookmark(id)
    );
  };

  const handleAddCurrent = () => {
    if (currentLocation) onAddBookmark(currentLocation);
  };

  const addDisabled = !currentLocation || isCurrentBookmarked || isLoading;

  return (
    <>
      <ReaderButton
        size={22}
        name={isCurrentBookmarked ? 'bookmark' : 'bookmark-border'}
        onPress={() => setVisible(true)}
        color={isCurrentBookmarked ? palette.accent : undefined}
      />

      <BaseModal
        visible={visible}
        title="Bookmarks"
        onClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={[styles.addRow, addDisabled && styles.addRowDisabled]}
          disabled={addDisabled}
          onPress={handleAddCurrent}
          activeOpacity={0.85}
        >
          <MaterialIcons
            name={isCurrentBookmarked ? 'bookmark' : 'bookmark-add'}
            size={20}
            color={addDisabled ? palette.textTertiary : palette.textInverse}
          />
          <Text
            style={[
              styles.addRowText,
              addDisabled && styles.addRowTextDisabled,
            ]}
          >
            {isLoading
              ? 'Loading bookmarks…'
              : isCurrentBookmarked
              ? 'Current page is bookmarked'
              : 'Bookmark current page'}
          </Text>
        </TouchableOpacity>

        {error ? (
          <Text style={styles.errorText}>
            Bookmark storage error: {error.message}
          </Text>
        ) : null}

        <Text style={modalStyles.sectionTitle}>
          Saved · {bookmarks.length}
        </Text>

        {bookmarks.length === 0 ? (
          <Text style={modalStyles.emptyText}>
            No bookmarks yet. Tap the button above to save the current page.
          </Text>
        ) : (
          bookmarks.map((b) => (
            <View key={b.id} style={modalStyles.cardItem}>
              <View style={styles.row}>
                <MaterialIcons
                  name="bookmark"
                  size={16}
                  color={palette.accent}
                />
                <Text style={styles.preview} numberOfLines={2}>
                  {b.label || previewText(b.locator)}
                </Text>
              </View>

              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle(b.locator)}
              </Text>

              <Text style={styles.timestamp}>
                {new Date(b.createdAt).toLocaleString()}
              </Text>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={modalStyles.actionButton}
                  onPress={() => {
                    setVisible(false);
                    onNavigateToBookmark(b.locator);
                  }}
                >
                  <Text style={modalStyles.actionButtonText}>Go to</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    modalStyles.actionButton,
                    modalStyles.destructiveButton,
                  ]}
                  onPress={() => handleDelete(b.id)}
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
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: palette.accent,
    paddingVertical: space.md + 2,
    paddingHorizontal: space.lg,
    borderRadius: radii.md,
    marginBottom: space.xl,
  },
  addRowDisabled: {
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.border,
  },
  addRowText: {
    color: palette.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
  addRowTextDisabled: {
    color: palette.textTertiary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.xs,
  },
  preview: {
    flex: 1,
    ...typography.bodyStrong,
  },
  subtitle: {
    ...typography.small,
    color: palette.textSecondary,
    marginLeft: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.md,
  },
  timestamp: {
    fontSize: 11,
    color: palette.textTertiary,
    marginLeft: 24,
    marginTop: space.xs,
  },
  errorText: {
    color: palette.destructive,
    fontSize: 13,
    marginBottom: space.md,
  },
});

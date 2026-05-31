import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Reader } from './Reader';
import type { ReaderHandle } from './Reader';
import { ControlBar } from './ControlBar';
import { AudioPlayer } from './AudioPlayer';
import { NarrationBar } from './NarrationBar';
import type { BookOption } from '../types/reader.types';
import type { ReadiumProps } from 'react-native-readium';
import { palette, space, shadow, typography } from '../styles/theme';

interface ReaderScreenProps {
  book: BookOption;
  onClose: () => void;
  onShowDetails: () => void;
  initialPreferences?: ReadiumProps['preferences'];
  onPreferencesChange?: (preferences: ReadiumProps['preferences']) => void;
}

// Lightweight header (back + title) used for the audiobook layout and while the
// EPUB publication is still loading (before the full ControlBar can render).
const SimpleHeader: React.FC<{ title: string; onClose: () => void }> = ({
  title,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.simpleHeader, { paddingTop: insets.top + space.xs }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onClose}
        accessibilityLabel="Back to library"
      >
        <MaterialIcons
          name="arrow-back"
          size={24}
          color={palette.textPrimary}
        />
      </TouchableOpacity>
      <Text style={styles.simpleHeaderTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.backButton} />
    </View>
  );
};

export const ReaderScreen: React.FC<ReaderScreenProps> = ({
  book,
  onClose,
  onShowDetails,
  initialPreferences,
  onPreferencesChange,
}) => {
  const [readerHandle, setReaderHandle] = useState<ReaderHandle | null>(null);

  const handleReaderReady = useCallback((handle: ReaderHandle) => {
    setReaderHandle(handle);
  }, []);

  // Pure audiobook: no EPUB rendering, just the full-screen audio player.
  if (book.kind === 'audiobook') {
    return (
      <View style={styles.container}>
        <SimpleHeader title={book.title} onClose={onClose} />
        {book.audioUrl ? (
          <AudioPlayer book={book} audioUrl={book.audioUrl} />
        ) : null}
      </View>
    );
  }

  const isReadalong = book.kind === 'readalong';

  return (
    <View style={styles.container}>
      {readerHandle ? (
        <ControlBar
          preferences={readerHandle.preferences}
          onPreferencesChange={readerHandle.setPreferences}
          toc={readerHandle.toc}
          onNavigateToTocItem={readerHandle.navigateToTocItem}
          highlights={readerHandle.highlights}
          onDeleteHighlight={readerHandle.deleteHighlight}
          onNavigateToHighlight={readerHandle.navigateToLocator}
          onEditHighlight={readerHandle.editHighlight}
          bookmarks={readerHandle.bookmarks}
          bookmarksLoading={readerHandle.bookmarksLoading}
          bookmarksError={readerHandle.bookmarksError}
          currentLocation={readerHandle.location}
          isCurrentBookmarked={readerHandle.isCurrentBookmarked}
          onAddBookmark={readerHandle.addBookmark}
          onDeleteBookmark={readerHandle.deleteBookmark}
          onNavigateToBookmark={readerHandle.navigateToLocator}
          onClose={onClose}
          title={book.title}
          onSearch={readerHandle.search}
          onCancelSearch={readerHandle.cancelSearch}
          onNavigate={readerHandle.navigateToLocator}
          readerHandle={readerHandle}
        />
      ) : (
        <SimpleHeader title={book.title} onClose={onClose} />
      )}

      <View style={styles.readerContainer}>
        <Reader
          key={book.id}
          publicationId={book.id}
          epubUrl={book.epubUrl}
          epubPath={book.epubPath}
          bundledAsset={book.bundledAsset}
          onReaderReady={handleReaderReady}
          initialPreferences={initialPreferences}
          onPreferencesChange={onPreferencesChange}
        />
        <TouchableOpacity
          style={styles.detailsFab}
          onPress={onShowDetails}
          accessibilityLabel="Book details"
        >
          <MaterialIcons
            name="info-outline"
            size={22}
            color={palette.textInverse}
          />
        </TouchableOpacity>
      </View>

      {/* Read-along: a separate narration track played under the EPUB text. */}
      {isReadalong && book.audioUrl ? (
        <NarrationBar audioUrl={book.audioUrl} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  readerContainer: {
    flex: 1,
  },
  simpleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingHorizontal: space.xs,
    paddingBottom: space.xs,
    minHeight: 48,
  },
  simpleHeaderTitle: {
    ...typography.bodyStrong,
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.md,
  },
});

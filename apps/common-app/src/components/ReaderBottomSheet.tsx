import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Reader } from './Reader';
import type { ReaderHandle } from './Reader';
import { ControlBar } from './ControlBar';
import type { BookOption } from '../types/reader.types';
import type { ReadiumProps } from 'react-native-readium';
import { palette, radii, space, typography, shadow } from '../styles/theme';

type ContentMode = 'reader' | 'details';

interface ReaderBottomSheetProps {
  book: BookOption | null;
  onClearBook: () => void;
  onClose: () => void;
  initialPreferences?: ReadiumProps['preferences'];
  onPreferencesChange?: (preferences: ReadiumProps['preferences']) => void;
}

const snapPoints = ['100%'];

const COVER_TINTS: Array<[string, string]> = [
  ['#E9E4DA', '#2A2823'],
  ['#DDE7E1', '#1F3A2E'],
  ['#E8DEEA', '#3B2A4A'],
  ['#F4E1D2', '#5A2E18'],
  ['#D9E2F0', '#1F3A5C'],
  ['#EFE1DC', '#5C2B1F'],
];

const hashCode = (str: string) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

const tintFor = (id: string) => COVER_TINTS[hashCode(id) % COVER_TINTS.length];

const initialsFor = (title: string) =>
  title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

const BookDetails: React.FC<{
  book: BookOption;
  onOpenReader: () => void;
}> = ({ book, onOpenReader }) => {
  const [bg, fg] = tintFor(book.id);
  return (
    <ScrollView contentContainerStyle={styles.detailsContent}>
      <View style={[styles.detailsCover, { backgroundColor: bg }]}>
        <Text style={[styles.detailsCoverInitials, { color: fg }]}>
          {initialsFor(book.title)}
        </Text>
        <View style={[styles.detailsCoverSpine, { backgroundColor: fg }]} />
      </View>

      <Text style={styles.detailsEyebrow}>Now Reading</Text>
      <Text style={styles.detailsTitle}>{book.title}</Text>
      <Text style={styles.detailsAuthor}>{book.author}</Text>

      <View style={styles.detailsCard}>
        <Text style={styles.detailsDescription}>
          This screen demonstrates that the ReadiumView native fragment is
          properly torn down when the Reader unmounts — if cleanup were broken,
          this view would be covered by a stale WebView and the button below
          would not be tappable.
        </Text>
      </View>

      <TouchableOpacity style={styles.openReaderButton} onPress={onOpenReader}>
        <MaterialIcons name="chrome-reader-mode" size={18} color={palette.textInverse} />
        <Text style={styles.openReaderButtonText}>Open Reader</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export const ReaderBottomSheet: React.FC<ReaderBottomSheetProps> = ({
  book,
  onClearBook,
  onClose,
  initialPreferences,
  onPreferencesChange,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [readerHandle, setReaderHandle] = useState<ReaderHandle | null>(null);
  const [contentMode, setContentMode] = useState<ContentMode>('reader');
  const wasOpen = useRef(false);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index >= 0) {
        wasOpen.current = true;
      } else if (index === -1 && wasOpen.current) {
        wasOpen.current = false;
        onClose();
      }
    },
    [onClose]
  );

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  const handleReaderReady = useCallback((handle: ReaderHandle) => {
    setReaderHandle(handle);
  }, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      enablePanDownToClose
      enableDynamicSizing={false}
      activeOffsetY={Platform.OS === 'android' ? [-5, 5] : undefined}
      failOffsetX={Platform.OS === 'android' ? [-5, 5] : undefined}
      handleComponent={() => null}
      backgroundStyle={styles.sheetBackground}
    >
      <View style={styles.content}>
        {contentMode === 'reader' ? (
          <>
            {book && readerHandle ? (
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
                onClearBook={onClearBook}
                onClose={handleClose}
                title={book.title}
                onSearch={readerHandle.search}
                onCancelSearch={readerHandle.cancelSearch}
                onNavigate={readerHandle.navigateToLocator}
                readerHandle={readerHandle}
              />
            ) : (
              <EmptyBar onClose={handleClose} />
            )}

            {book ? (
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
                  onPress={() => setContentMode('details')}
                  accessibilityLabel="Book details"
                >
                  <MaterialIcons
                    name="info-outline"
                    size={22}
                    color={palette.textInverse}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.placeholder}>
                <MaterialIcons
                  name="auto-stories"
                  size={48}
                  color={palette.textTertiary}
                />
                <Text style={styles.placeholderText}>
                  Select a book to start reading
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <EmptyBar onClose={handleClose} title="Details" />
            {book ? (
              <BookDetails
                book={book}
                onOpenReader={() => setContentMode('reader')}
              />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>No book selected</Text>
              </View>
            )}
          </>
        )}
      </View>
    </BottomSheet>
  );
};

const EmptyBar: React.FC<{ onClose: () => void; title?: string }> = ({
  onClose,
  title,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.emptyBar, { paddingTop: insets.top + space.xs }]}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
        accessibilityLabel="Close"
      >
        <MaterialIcons
          name="keyboard-arrow-down"
          size={26}
          color={palette.textPrimary}
        />
      </TouchableOpacity>
      {title ? (
        <Text style={styles.emptyBarTitle} numberOfLines={1}>
          {title}
        </Text>
      ) : null}
      <View style={styles.closeButton} />
    </View>
  );
};

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: palette.bg,
  },
  content: {
    flex: 1,
  },
  readerContainer: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xxl,
  },
  placeholderText: {
    ...typography.body,
    color: palette.textTertiary,
    textAlign: 'center',
  },
  emptyBar: {
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
  emptyBarTitle: {
    ...typography.bodyStrong,
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
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
  detailsContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: space.xxl,
    paddingTop: space.xxl,
    paddingBottom: space.xxxl,
    gap: space.sm,
  },
  detailsCover: {
    width: 144,
    height: 200,
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: space.lg,
    overflow: 'hidden',
    ...shadow.md,
  },
  detailsCoverSpine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    opacity: 0.6,
  },
  detailsCoverInitials: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: 1,
  },
  detailsEyebrow: {
    ...typography.caption,
    color: palette.textTertiary,
    marginBottom: space.xs,
  },
  detailsTitle: {
    ...typography.title,
    textAlign: 'center',
  },
  detailsAuthor: {
    ...typography.body,
    color: palette.textSecondary,
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: space.lg,
    marginTop: space.xl,
  },
  detailsDescription: {
    ...typography.body,
    color: palette.textSecondary,
    lineHeight: 22,
  },
  openReaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: palette.accent,
    paddingHorizontal: space.xxl,
    paddingVertical: space.md + 2,
    borderRadius: radii.pill,
    marginTop: space.xxl,
  },
  openReaderButtonText: {
    color: palette.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
});

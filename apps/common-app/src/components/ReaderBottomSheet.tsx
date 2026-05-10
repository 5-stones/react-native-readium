import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Reader } from './Reader';
import type { ReaderHandle } from './Reader';
import { ControlBar } from './ControlBar';
import type { BookOption, PublicationFormat } from '../types/reader.types';
import type { ReadiumProps } from 'react-native-readium';

type ContentMode = 'reader' | 'details';

interface ReaderBottomSheetProps {
  book: BookOption | null;
  onClearBook: () => void;
  onClose: () => void;
  initialPreferences?: ReadiumProps['preferences'];
  onPreferencesChange?: (preferences: ReadiumProps['preferences']) => void;
}

const snapPoints = ['100%'];

/**
 * Shows book metadata and a button to open the reader.
 * Used to test that ReadiumView's native Fragment is fully cleaned up
 * when switching away from the Reader — if the Fragment persists, it
 * will overlay this view and block touches.
 */
const BookDetails: React.FC<{
  book: BookOption;
  onOpenReader: () => void;
}> = ({ book, onOpenReader }) => {
  return (
    <ScrollView contentContainerStyle={styles.detailsContent}>
      <View style={styles.detailsCover}>
        <MaterialIcons name="menu-book" size={100} color="#888" />
      </View>
      <Text style={styles.detailsTitle}>{book.title}</Text>
      <Text style={styles.detailsAuthor}>{book.author}</Text>

      <Text style={styles.detailsDescription}>
        This view demonstrates that the ReadiumView native Fragment is
        properly removed when React unmounts the Reader component. If the
        Fragment cleanup is broken, this view will be covered by the stale
        WebView and the button below will not be pressable.
      </Text>

      <TouchableOpacity style={styles.openReaderButton} onPress={onOpenReader}>
        <MaterialIcons name="chrome-reader-mode" size={20} color="#FFF" />
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
    >
      <View style={styles.content}>
        {contentMode === 'reader' ? (
          <>
            {book && readerHandle && book.format !== 'cbz' ? (
              <ControlBar
                preferences={readerHandle.preferences}
                onPreferencesChange={readerHandle.setPreferences}
                toc={readerHandle.toc}
                onNavigateToTocItem={readerHandle.navigateToTocItem}
                highlights={readerHandle.highlights}
                onDeleteHighlight={readerHandle.deleteHighlight}
                onNavigateToHighlight={readerHandle.navigateToLocator}
                onEditHighlight={readerHandle.editHighlight}
                onClearBook={onClearBook}
                onClose={handleClose}
              />
            ) : (
              <EmptyBar onClose={handleClose} />
            )}

            {book ? (
              <View style={styles.readerContainer}>
                <Reader
                  key={book.id}
                  format={book.format}
                  url={book.url}
                  path={book.path}
                  bundledAsset={book.bundledAsset}
                  onReaderReady={handleReaderReady}
                  initialPreferences={initialPreferences}
                  onPreferencesChange={onPreferencesChange}
                />
                <TouchableOpacity
                  style={styles.detailsFab}
                  onPress={() => setContentMode('details')}
                >
                  <MaterialIcons name="info-outline" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.placeholder}>
                <MaterialIcons name="menu-book" size={64} color="#CCC" />
                <Text style={styles.placeholderText}>
                  Select a book to start reading
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <EmptyBar onClose={handleClose} />
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

const EmptyBar: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.emptyBar, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
        accessibilityLabel="Close"
      >
        <MaterialIcons name="keyboard-arrow-down" size={28} color="#333" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
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
    gap: 16,
  },
  placeholderText: {
    fontSize: 17,
    color: '#999',
  },
  emptyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 48,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  detailsContent: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  detailsCover: {
    width: 160,
    height: 200,
    backgroundColor: '#E8E8E8',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
  },
  detailsAuthor: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  detailsDescription: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  openReaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 24,
  },
  openReaderButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { ReadiumView } from 'react-native-readium';
import type { SelectionAction } from 'react-native-readium';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { ReaderButton } from './ReaderButton';
import { TableOfContents } from './TableOfContents';
import { PreferencesEditor } from './PreferencesEditor';
import {
  HighlightManager,
  HighlightColorPicker,
  HighlightEditDialog,
} from './highlights';

import { useEpubFile } from '../hooks/useEpubFile';
import { useReaderState } from '../hooks/useReaderState';
import { useHighlights } from '../hooks/useHighlights';

import { styles } from '../styles/reader';
import type { ReaderProps, BookOption } from '../types/reader.types';
export type { BookOption } from '../types/reader.types';

// Configure selection actions
const selectionActions: SelectionAction[] = [
  { id: 'highlight', label: '📑 Highlight' },
];

export const Reader: React.FC<ReaderProps> = ({
  epubUrl,
  epubPath,
  initialLocation,
  books,
}) => {
  const [activeBook, setActiveBook] = useState<BookOption | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const currentUrl = activeBook?.epubUrl ?? epubUrl;
  const currentPath = activeBook?.epubPath ?? epubPath;

  const handleSelectBook = useCallback((book: BookOption) => {
    setActiveBook(book);
    setPickerVisible(false);
  }, []);

  const showBookPicker = books && books.length > 1;

  return (
    <ReaderInner
      key={activeBook?.id ?? 'default'}
      epubUrl={currentUrl}
      epubPath={currentPath}
      initialLocation={initialLocation}
      books={showBookPicker ? books : undefined}
      activeBookId={activeBook?.id}
      pickerVisible={pickerVisible}
      onOpenPicker={() => setPickerVisible(true)}
      onClosePicker={() => setPickerVisible(false)}
      onSelectBook={handleSelectBook}
    />
  );
};

interface ReaderInnerProps {
  epubUrl: string;
  epubPath?: string;
  initialLocation?: ReaderProps['initialLocation'];
  books?: BookOption[];
  activeBookId?: string;
  pickerVisible: boolean;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  onSelectBook: (book: BookOption) => void;
}

const ReaderInner: React.FC<ReaderInnerProps> = ({
  epubUrl,
  epubPath,
  initialLocation,
  books,
  activeBookId,
  pickerVisible,
  onOpenPicker,
  onClosePicker,
  onSelectBook,
}) => {
  const ref = useRef<any>(undefined);

  // File loading
  const { file, isLoading, error } = useEpubFile({
    epubUrl,
    epubPath,
    initialLocation,
  });

  // Reader state (location, preferences, TOC)
  const {
    toc,
    location,
    preferences,
    setLocation,
    setPreferences,
    handleLocationChange,
    handlePublicationReady,
    navigateToTocItem,
  } = useReaderState();

  // Highlight management
  const {
    decorations,
    highlights,
    colorPickerVisible,
    pendingHighlight,
    editDialogVisible,
    selectedHighlight,
    handleSelectionChange,
    handleSelectionAction,
    handleCreateHighlight,
    handleCancelHighlight,
    handleDeleteHighlight,
    handleUpdateHighlight,
    handleDecorationActivated,
    handleEditHighlight,
    handleDeleteFromDialog,
    handleCancelEdit,
  } = useHighlights();

  // Loading state
  if (isLoading || !file) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading EPUB...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Error loading EPUB: {error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        {books && (
          <View style={styles.button}>
            <BookPicker
              books={books}
              activeBookId={activeBookId}
              visible={pickerVisible}
              onOpen={onOpenPicker}
              onClose={onClosePicker}
              onSelect={onSelectBook}
            />
          </View>
        )}
        <View style={styles.button}>
          <TableOfContents items={toc} onPress={navigateToTocItem} />
        </View>
        <View style={styles.button}>
          <PreferencesEditor
            preferences={preferences}
            onChange={setPreferences}
          />
        </View>
        <View style={styles.button}>
          <HighlightManager
            highlights={highlights}
            onDeleteHighlight={handleDeleteHighlight}
            onNavigateToHighlight={setLocation}
            onEditHighlight={handleEditHighlight}
          />
        </View>
      </View>

      <View style={styles.reader}>
        {Platform.OS === 'web' ? (
          <ReaderButton
            name="chevron-left"
            style={{ width: '10%' }}
            onPress={() => ref.current?.goBackward()}
          />
        ) : null}

        <View style={styles.readiumContainer}>
          <ReadiumView
            ref={ref}
            file={file}
            location={location}
            preferences={preferences}
            decorations={decorations}
            selectionActions={selectionActions}
            onLocationChange={handleLocationChange}
            onPublicationReady={handlePublicationReady}
            onDecorationActivated={handleDecorationActivated}
            onSelectionChange={handleSelectionChange}
            onSelectionAction={handleSelectionAction}
          />
        </View>

        {Platform.OS === 'web' ? (
          <ReaderButton
            name="chevron-right"
            style={{ width: '10%' }}
            onPress={() => ref.current?.goForward()}
          />
        ) : null}
      </View>

      <HighlightColorPicker
        visible={colorPickerVisible}
        locator={pendingHighlight?.locator || null}
        selectedText={pendingHighlight?.selectedText || ''}
        onConfirm={handleCreateHighlight}
        onCancel={handleCancelHighlight}
      />

      <HighlightEditDialog
        visible={editDialogVisible}
        highlight={selectedHighlight}
        onUpdate={handleUpdateHighlight}
        onDelete={handleDeleteFromDialog}
        onCancel={handleCancelEdit}
      />
    </View>
  );
};

// MARK: - Book Picker

interface BookPickerProps {
  books: BookOption[];
  activeBookId?: string;
  visible: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (book: BookOption) => void;
}

const BookPicker: React.FC<BookPickerProps> = ({
  books,
  activeBookId,
  visible,
  onOpen,
  onClose,
  onSelect,
}) => (
  <>
    <TouchableOpacity
      onPress={onOpen}
      style={pickerStyles.triggerButton}
      accessibilityRole="button"
      accessibilityLabel="Switch book"
    >
      <MaterialIcons name="library-books" size={28} />
    </TouchableOpacity>

    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={pickerStyles.overlay}>
        <View style={pickerStyles.modal}>
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>Choose a Book</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Text style={pickerStyles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={pickerStyles.list}>
            {books.map((book) => (
              <TouchableOpacity
                key={book.id}
                style={[
                  pickerStyles.bookRow,
                  book.id === activeBookId && pickerStyles.bookRowSelected,
                ]}
                onPress={() => onSelect(book)}
              >
                <Text style={pickerStyles.bookTitle}>{book.title}</Text>
                <Text style={pickerStyles.bookAuthor}>{book.author}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>
);

const pickerStyles = StyleSheet.create({
  triggerButton: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  close: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
  },
  bookRow: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  bookRowSelected: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#90caf9',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  bookAuthor: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
});

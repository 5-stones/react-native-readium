import React, { useRef } from 'react';
import { View, Text, Platform } from 'react-native';
import { ReadiumView } from 'react-native-readium';
import type { SelectionAction } from 'react-native-readium';

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
import type { ReaderProps } from '../types/reader.types';

// Configure selection actions
const selectionActions: SelectionAction[] = [
  { id: 'highlight', label: '📑 Highlight' },
];

export const Reader: React.FC<ReaderProps> = ({
  epubUrl,
  epubPath,
  initialLocation,
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
            highlights={decorations.highlights || []}
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
            onPress={() => ref.current?.prevPage()}
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
            onPress={() => ref.current?.nextPage()}
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

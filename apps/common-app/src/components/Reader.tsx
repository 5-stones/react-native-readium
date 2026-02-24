import React, { useRef } from 'react';
import { View, Text, Platform } from 'react-native';
import { ReadiumView } from 'react-native-readium';
import type {
  ReadiumProps,
  Link,
  Locator,
  Decoration,
  SelectionAction,
  PublicationReadyEvent,
} from 'react-native-readium';

import { ReaderButton } from './ReaderButton';
import {
  HighlightColorPicker,
  HighlightEditDialog,
} from './highlights';

import { useEpubFile } from '../hooks/useEpubFile';
import { useReaderState } from '../hooks/useReaderState';
import { useHighlights } from '../hooks/useHighlights';

import { styles } from '../styles/reader';
import type { ReaderProps as BaseReaderProps } from '../types/reader.types';
export type { BookOption } from '../types/reader.types';

const selectionActions: SelectionAction[] = [
  { id: 'highlight', label: '📑 Highlight' },
];

export interface ReaderHandle {
  toc: Link[] | null;
  location: Locator | undefined;
  preferences: ReadiumProps['preferences'];
  setPreferences: (prefs: ReadiumProps['preferences']) => void;
  setLocation: (loc: Locator | undefined) => void;
  navigateToTocItem: (item: Link) => void;
  highlights: Decoration[];
  deleteHighlight: (id: string) => void;
  editHighlight: (highlight: Decoration) => void;
}

interface ReaderProps extends BaseReaderProps {
  onReaderReady?: (handle: ReaderHandle) => void;
}

export const Reader: React.FC<ReaderProps> = ({
  epubUrl,
  epubPath,
  bundledAsset,
  initialLocation,
  onReaderReady,
}) => {
  const ref = useRef<any>(undefined);

  const { file, isLoading, error } = useEpubFile({
    epubUrl,
    epubPath,
    bundledAsset,
    initialLocation,
  });

  const {
    toc,
    location,
    preferences,
    setLocation,
    setPreferences,
    handleLocationChange,
    handlePublicationReady: baseHandlePublicationReady,
    navigateToTocItem,
  } = useReaderState();

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

  const handlePublicationReady = React.useCallback(
    (event: PublicationReadyEvent) => {
      baseHandlePublicationReady(event);
    },
    [baseHandlePublicationReady]
  );

  // Expose reader state to parent via callback
  React.useEffect(() => {
    if (onReaderReady) {
      onReaderReady({
        toc,
        location,
        preferences,
        setPreferences,
        setLocation,
        navigateToTocItem,
        highlights,
        deleteHighlight: handleDeleteHighlight,
        editHighlight: handleEditHighlight,
      });
    }
  }, [
    toc,
    location,
    preferences,
    highlights,
    onReaderReady,
    setPreferences,
    setLocation,
    navigateToTocItem,
    handleDeleteHighlight,
    handleEditHighlight,
  ]);

  if (isLoading || !file) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading EPUB...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Error loading EPUB: {error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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

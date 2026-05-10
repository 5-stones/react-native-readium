import React, { useRef, useCallback } from 'react';
import { View, Text, Platform } from 'react-native';
import { ReadiumView } from 'react-native-readium';
import type {
  ReadiumViewRef,
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

const epubSelectionActions: SelectionAction[] = [
  { id: 'highlight', label: '📑 Highlight' },
];

export interface ReaderHandle {
  toc: Link[] | null;
  location: Locator | undefined;
  preferences: ReadiumProps['preferences'];
  setPreferences: (prefs: ReadiumProps['preferences']) => void;
  navigateToLocator: (locator: Locator) => void;
  navigateToTocItem: (item: Link) => void;
  highlights: Decoration[];
  deleteHighlight: (id: string) => void;
  editHighlight: (highlight: Decoration) => void;
}

interface ReaderProps extends BaseReaderProps {
  onReaderReady?: (handle: ReaderHandle) => void;
  initialPreferences?: ReadiumProps['preferences'];
  onPreferencesChange?: (preferences: ReadiumProps['preferences']) => void;
}

export const Reader: React.FC<ReaderProps> = ({
  format = 'epub',
  url,
  path,
  bundledAsset,
  initialLocation,
  onReaderReady,
  initialPreferences,
  onPreferencesChange,
}) => {
  const ref = useRef<ReadiumViewRef>(null);

  const { file, isLoading, error } = useEpubFile({
    url,
    path,
    bundledAsset,
    initialLocation,
  });

  const {
    toc,
    location,
    preferences,
    setPreferences,
    handleLocationChange,
    handlePublicationReady: baseHandlePublicationReady,
  } = useReaderState({ initialPreferences, onPreferencesChange });

  const navigateToLocator = useCallback((locator: Locator) => {
    ref.current?.goTo(locator);
  }, []);

  const navigateToTocItem = useCallback((item: Link) => {
    ref.current?.goTo({
      href: item.href,
      type: item.type || 'application/xhtml+xml',
      title: item.title || '',
      locations: {
        progression: 0,
      },
    });
  }, []);

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
        navigateToLocator,
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
    navigateToLocator,
    navigateToTocItem,
    handleDeleteHighlight,
    handleEditHighlight,
  ]);

  if (isLoading || !file) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Error loading file: {error.message}</Text>
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
            preferences={format === 'epub' ? preferences : undefined}
            decorations={format === 'epub' ? decorations : undefined}
            selectionActions={format === 'epub' ? epubSelectionActions : undefined}
            onLocationChange={handleLocationChange}
            onPublicationReady={handlePublicationReady}
            onDecorationActivated={format === 'epub' ? handleDecorationActivated : undefined}
            onSelectionChange={format === 'epub' ? handleSelectionChange : undefined}
            onSelectionAction={format === 'epub' ? handleSelectionAction : undefined}
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

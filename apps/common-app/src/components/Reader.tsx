import React, { useRef, useCallback, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { ReadiumView, useSearch } from 'react-native-readium';
import type {
  ReadiumViewRef,
  ReadiumProps,
  Link,
  Locator,
  Decoration,
  SelectionAction,
  PublicationReadyEvent,
  SearchResult,
  SearchOptions,
  ReadiumFile,
  ZoomEvent,
} from 'react-native-readium';

import { ReaderButton } from './ReaderButton';
import {
  HighlightColorPicker,
  HighlightEditDialog,
} from './highlights';

import { useBook } from '../hooks/useBook';
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
  navigateToLocator: (locator: Locator) => void;
  navigateToTocItem: (item: Link) => void;
  highlights: Decoration[];
  deleteHighlight: (id: string) => void;
  editHighlight: (highlight: Decoration) => void;
  search: (query: string, options?: SearchOptions) => void;
  loadMoreSearchResults: () => void;
  clearSearch: () => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  isLoadingMoreResults: boolean;
  isSearchSupported: boolean;
  hasMoreSearchResults: boolean;
  file: ReadiumFile | undefined;
  zoom: ZoomEvent | undefined;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitWidth: () => void;
  fitHeight: () => void;
}

interface ReaderProps extends BaseReaderProps {
  onReaderReady?: (handle: ReaderHandle) => void;
  initialPreferences?: ReadiumProps['preferences'];
  onPreferencesChange?: (preferences: ReadiumProps['preferences']) => void;
}

export const Reader: React.FC<ReaderProps> = ({
  asset: bookAsset,
  initialLocation,
  onReaderReady,
  initialPreferences,
  onPreferencesChange,
}) => {
  const ref = useRef<ReadiumViewRef>(null);

  const { file, isLoading, error } = useBook({
    asset: bookAsset,
    initialLocation,
  });

  // Only for presentation: PDFs scroll, EPUBs paginate, so the page chevrons
  // are meaningless for a PDF. Loading and opening the publication does not
  // depend on knowing the format.
  const isPdf = !!bookAsset?.toLowerCase().split('?')[0].endsWith('.pdf');
  const fileTypeLabel = isPdf ? 'PDF' : 'EPUB';
  const showChevrons = Platform.OS === 'web' && !isPdf;

  const {
    toc,
    location,
    preferences,
    setPreferences,
    handleLocationChange,
    handlePublicationReady: baseHandlePublicationReady,
  } = useReaderState({ initialPreferences, onPreferencesChange });

  const [zoom, setZoom] = useState<ZoomEvent | undefined>(undefined);
  const handleZoomChange = useCallback((event: ZoomEvent) => {
    setZoom(event);
  }, []);
  const zoomIn = useCallback(() => ref.current?.zoomIn(), []);
  const zoomOut = useCallback(() => ref.current?.zoomOut(), []);
  const resetZoom = useCallback(() => ref.current?.resetZoom(), []);
  const fitWidth = useCallback(() => ref.current?.fitWidth(), []);
  const fitHeight = useCallback(() => ref.current?.fitHeight(), []);

  const {
    results: searchResults,
    isSearching,
    isLoadingMore: isLoadingMoreResults,
    isSupported: isSearchSupported,
    hasMore: hasMoreSearchResults,
    search,
    loadMore: loadMoreSearchResults,
    clear: clearSearch,
  } = useSearch(ref);

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
        search,
        loadMoreSearchResults,
        clearSearch,
        searchResults,
        isSearching,
        isLoadingMoreResults,
        isSearchSupported,
        hasMoreSearchResults,
        file,
        zoom,
        zoomIn,
        zoomOut,
        resetZoom,
        fitWidth,
        fitHeight,
      });
    }
  }, [
    toc,
    location,
    preferences,
    highlights,
    searchResults,
    isSearching,
    isLoadingMoreResults,
    isSearchSupported,
    hasMoreSearchResults,
    onReaderReady,
    setPreferences,
    navigateToLocator,
    navigateToTocItem,
    handleDeleteHighlight,
    handleEditHighlight,
    search,
    loadMoreSearchResults,
    clearSearch,
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    fitWidth,
    fitHeight,
  ]);

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Error loading {fileTypeLabel}: {error.message}</Text>
      </View>
    );
  }

  if (isLoading || !file) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading {fileTypeLabel}...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.reader}>
        {showChevrons ? (
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
            preferences={preferences}
            decorations={decorations}
            selectionActions={selectionActions}
            onLocationChange={handleLocationChange}
            onPublicationReady={handlePublicationReady}
            onDecorationActivated={handleDecorationActivated}
            onSelectionChange={handleSelectionChange}
            onSelectionAction={handleSelectionAction}
            onZoomChange={handleZoomChange}
          />
        </View>

        {showChevrons ? (
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

import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, Text, Platform } from 'react-native';
import { palette, space, typography } from '../styles/theme';
import { ReadiumView } from 'react-native-readium';
import type {
  ReadiumViewRef,
  ReadiumProps,
  Link,
  Locator,
  Decoration,
  DecorationGroup,
  SelectionAction,
  PublicationReadyEvent,
  PublicationInfo,
  ReadiumError,
  UnsupportedCapabilityEvent,
  SearchProgressEvent,
  SearchOptions,
  SearchResult,
  SelectionEvent,
  ResourceResponse,
  MediaState,
} from 'react-native-readium';

import { ReaderButton } from './ReaderButton';
import {
  HighlightColorPicker,
  HighlightEditDialog,
} from './highlights';

import { useEpubFile } from '../hooks/useEpubFile';
import { useReaderState } from '../hooks/useReaderState';
import { useHighlights } from '../hooks/useHighlights';
import { useBookmarks } from '../hooks/useBookmarks';

import { styles } from '../styles/reader';
import type {
  ReaderProps as BaseReaderProps,
  Bookmark,
} from '../types/reader.types';
export type { BookOption } from '../types/reader.types';

const selectionActions: SelectionAction[] = [
  { id: 'highlight', label: '🖍 Highlight' },
];

export type EventLogEntry = {
  id: string;
  type: 'error' | 'unsupported' | 'searchProgress' | 'mediaState' | 'mediaError';
  timestamp: number;
  payload: unknown;
};

const MAX_LOG_ENTRIES = 30;

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
  bookmarks: Bookmark[];
  bookmarksLoading: boolean;
  bookmarksError: Error | null;
  isCurrentBookmarked: boolean;
  addBookmark: (locator: Locator) => void;
  deleteBookmark: (id: string) => void;

  // Imperative ref methods exposed for search + debug UIs.
  search: (query: string, options?: SearchOptions) => Promise<SearchResult[]>;
  cancelSearch: () => void;
  getPublication: () => Promise<PublicationInfo>;
  getCurrentLocation: () => Promise<Locator>;
  getCurrentSelection: () => Promise<SelectionEvent>;
  clearSelection: () => void;
  setSelection: (locator: Locator) => Promise<boolean>;
  getResource: (href: string) => Promise<ResourceResponse>;
  getPositions: () => Promise<Locator[]>;
  getTableOfContents: () => Promise<Link[]>;
  getMediaState: () => Promise<MediaState>;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (position: number) => void;
  skipToNext: () => void;
  skipToPrevious: () => void;
  setPlaybackRate: (rate: number) => void;

  // Highlights a search result on-page for a few seconds, then auto-clears.
  highlightSearchResult: (locator: Locator) => void;

  // Diagnostics surface for the debug panel.
  eventLog: EventLogEntry[];
  clearEventLog: () => void;
}

interface ReaderProps extends BaseReaderProps {
  onReaderReady?: (handle: ReaderHandle) => void;
  initialPreferences?: ReadiumProps['preferences'];
  onPreferencesChange?: (preferences: ReadiumProps['preferences']) => void;
}

export const Reader: React.FC<ReaderProps> = ({
  epubUrl,
  epubPath,
  bundledAsset,
  publicationId,
  initialLocation,
  onReaderReady,
  initialPreferences,
  onPreferencesChange,
}) => {
  const ref = useRef<ReadiumViewRef>(null);

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
    setPreferences,
    handleLocationChange,
    handlePublicationReady: baseHandlePublicationReady,
  } = useReaderState({ initialPreferences, onPreferencesChange });

  const navigateToLocator = useCallback((locator: Locator) => {
    ref.current?.goTo(locator);
  }, []);

  // Transient on-page highlight for a tapped search result.
  const [searchHighlight, setSearchHighlight] = useState<Decoration | null>(
    null
  );
  const searchHighlightTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const highlightSearchResult = useCallback((locator: Locator) => {
    if (searchHighlightTimer.current) {
      clearTimeout(searchHighlightTimer.current);
    }
    setSearchHighlight({
      id: `search-${Date.now()}`,
      locator,
      style: { type: 'highlight', tint: '#FFD23F' },
    });
    searchHighlightTimer.current = setTimeout(() => {
      setSearchHighlight(null);
      searchHighlightTimer.current = null;
    }, 4000);
  }, []);
  useEffect(() => {
    return () => {
      if (searchHighlightTimer.current) {
        clearTimeout(searchHighlightTimer.current);
      }
    };
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

  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const appendEvent = useCallback(
    (type: EventLogEntry['type'], payload: unknown) => {
      setEventLog((prev) => {
        const next: EventLogEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type,
          timestamp: Date.now(),
          payload,
        };
        return [next, ...prev].slice(0, MAX_LOG_ENTRIES);
      });
    },
    []
  );
  const clearEventLog = useCallback(() => setEventLog([]), []);

  const onReadiumError = useCallback(
    (err: ReadiumError) => appendEvent('error', err),
    [appendEvent]
  );
  const onUnsupportedCapability = useCallback(
    (e: UnsupportedCapabilityEvent) => appendEvent('unsupported', e),
    [appendEvent]
  );
  const onSearchProgress = useCallback(
    (e: SearchProgressEvent) => appendEvent('searchProgress', e),
    [appendEvent]
  );
  const onMediaStateChange = useCallback(
    (state: MediaState) => appendEvent('mediaState', state),
    [appendEvent]
  );
  const onMediaError = useCallback(
    (err: ReadiumError) => appendEvent('mediaError', err),
    [appendEvent]
  );

  // Imperative ref wrappers — safe fallbacks if the ref isn't ready yet.
  const search = useCallback(
    async (query: string, options?: SearchOptions) =>
      (await ref.current?.search(query, options)) ?? [],
    []
  );
  const cancelSearch = useCallback(() => ref.current?.cancelSearch(), []);
  const getPublication = useCallback(
    async () =>
      (await ref.current?.getPublication()) ?? (null as unknown as PublicationInfo),
    []
  );
  const getCurrentLocation = useCallback(
    async () =>
      (await ref.current?.getCurrentLocation()) ?? (null as unknown as Locator),
    []
  );
  const getCurrentSelection = useCallback(
    async () =>
      (await ref.current?.getCurrentSelection()) ??
      (null as unknown as SelectionEvent),
    []
  );
  const clearSelection = useCallback(() => ref.current?.clearSelection(), []);
  const setSelection = useCallback(
    async (locator: Locator) =>
      (await ref.current?.setSelection(locator)) ?? false,
    []
  );
  const getResource = useCallback(
    async (href: string) =>
      (await ref.current?.getResource(href)) ??
      (null as unknown as ResourceResponse),
    []
  );
  const getPositions = useCallback(
    async () => (await ref.current?.getPositions()) ?? [],
    []
  );
  const getTableOfContents = useCallback(
    async () => (await ref.current?.getTableOfContents()) ?? [],
    []
  );
  const getMediaState = useCallback(
    async () =>
      (await ref.current?.getMediaState()) ?? (null as unknown as MediaState),
    []
  );
  const play = useCallback(() => ref.current?.play(), []);
  const pause = useCallback(() => ref.current?.pause(), []);
  const stop = useCallback(() => ref.current?.stop(), []);
  const seekTo = useCallback((pos: number) => ref.current?.seekTo(pos), []);
  const skipToNext = useCallback(() => ref.current?.skipToNext(), []);
  const skipToPrevious = useCallback(
    () => ref.current?.skipToPrevious(),
    []
  );
  const setPlaybackRate = useCallback(
    (rate: number) => ref.current?.setPlaybackRate(rate),
    []
  );

  const {
    bookmarks,
    addBookmark,
    deleteBookmark,
    isBookmarked,
    isLoading: bookmarksLoading,
    error: bookmarksError,
  } = useBookmarks({
    publicationId,
    epubPath,
    epubUrl,
    bundledAsset,
  });

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

  const isCurrentBookmarked = isBookmarked(location);

  // Merge user highlights with the transient search-result group.
  // The search-results group is ALWAYS present so the native side gets the
  // "remove all" signal when its decorations array goes back to empty.
  const mergedDecorations = useMemo<DecorationGroup[]>(() => {
    return [
      ...decorations,
      {
        name: 'search-results',
        decorations: searchHighlight ? [searchHighlight] : [],
      },
    ];
  }, [decorations, searchHighlight]);

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
        bookmarks,
        bookmarksLoading,
        bookmarksError,
        isCurrentBookmarked,
        addBookmark,
        deleteBookmark,
        search,
        cancelSearch,
        getPublication,
        getCurrentLocation,
        getCurrentSelection,
        clearSelection,
        setSelection,
        getResource,
        getPositions,
        getTableOfContents,
        getMediaState,
        play,
        pause,
        stop,
        seekTo,
        skipToNext,
        skipToPrevious,
        setPlaybackRate,
        highlightSearchResult,
        eventLog,
        clearEventLog,
      });
    }
  }, [
    toc,
    location,
    preferences,
    highlights,
    bookmarks,
    bookmarksLoading,
    bookmarksError,
    isCurrentBookmarked,
    onReaderReady,
    setPreferences,
    navigateToLocator,
    navigateToTocItem,
    handleDeleteHighlight,
    handleEditHighlight,
    addBookmark,
    deleteBookmark,
    search,
    cancelSearch,
    getPublication,
    getCurrentLocation,
    getCurrentSelection,
    clearSelection,
    setSelection,
    getResource,
    getPositions,
    getTableOfContents,
    getMediaState,
    play,
    pause,
    stop,
    seekTo,
    skipToNext,
    skipToPrevious,
    setPlaybackRate,
    highlightSearchResult,
    eventLog,
    clearEventLog,
  ]);

  if (isLoading || !file) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={palette.textSecondary} />
        <Text
          style={{
            ...typography.small,
            marginTop: space.md,
            color: palette.textTertiary,
          }}
        >
          Loading book…
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text
          style={{
            ...typography.body,
            color: palette.destructive,
            textAlign: 'center',
            paddingHorizontal: space.xxl,
          }}
        >
          {error.message}
        </Text>
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
            preferences={preferences}
            decorations={mergedDecorations}
            selectionActions={selectionActions}
            onLocationChange={handleLocationChange}
            onPublicationReady={handlePublicationReady}
            onDecorationActivated={handleDecorationActivated}
            onSelectionChange={handleSelectionChange}
            onSelectionAction={handleSelectionAction}
            onError={onReadiumError}
            onUnsupportedCapability={onUnsupportedCapability}
            onSearchProgress={onSearchProgress}
            onMediaStateChange={onMediaStateChange}
            onMediaError={onMediaError}
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

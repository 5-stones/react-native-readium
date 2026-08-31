import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import type {
  ReadiumProps,
  ReadiumFile,
  Link,
  Decoration,
  Locator,
  SearchResult,
  SearchOptions,
  ZoomEvent,
} from 'react-native-readium';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TableOfContents } from './TableOfContents';
import { PreferencesEditor } from './PreferencesEditor';
import { HighlightManager } from './highlights';
import { SearchPanel } from './SearchPanel';

interface ControlBarProps {
  preferences: ReadiumProps['preferences'];
  onPreferencesChange: (preferences: ReadiumProps['preferences']) => void;
  toc: Link[] | null;
  onNavigateToTocItem: (item: Link) => void;
  highlights: Decoration[];
  onDeleteHighlight: (id: string) => void;
  onNavigateToHighlight: (locator: Locator) => void;
  onEditHighlight: (highlight: Decoration) => void;
  onClearBook: () => void;
  onClose: () => void;
  onSearch: (query: string, options?: SearchOptions) => void;
  onLoadMoreSearchResults: () => void;
  onClearSearch: () => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  isLoadingMoreResults: boolean;
  isSearchSupported: boolean;
  hasMoreSearchResults: boolean;
  file: ReadiumFile | undefined;
  zoom: ZoomEvent | undefined;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitWidth: () => void;
  onFitHeight: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  preferences,
  onPreferencesChange,
  toc,
  onNavigateToTocItem,
  highlights,
  onDeleteHighlight,
  onNavigateToHighlight,
  onEditHighlight,
  onClearBook,
  onClose,
  onSearch,
  onLoadMoreSearchResults,
  onClearSearch,
  searchResults,
  isSearching,
  isLoadingMoreResults,
  isSearchSupported,
  hasMoreSearchResults,
  file,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitWidth,
  onFitHeight,
}) => {
  const isPdf = file?.url?.toLowerCase().split('?')[0].endsWith('.pdf');
  const insets = useSafeAreaInsets();
  const showZoom = Platform.OS === 'web' && isPdf && !!zoom;
  const canZoomIn = !!zoom && zoom.scale < zoom.max - 0.001;
  const canZoomOut = !!zoom && zoom.scale > zoom.min + 0.001;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
        accessibilityLabel="Close reader"
      >
        <MaterialIcons name="keyboard-arrow-down" size={28} color="#333" />
      </TouchableOpacity>

      <View style={styles.controls}>
        {showZoom && (
          <View style={styles.zoomGroup}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onZoomOut}
              disabled={!canZoomOut}
              accessibilityLabel="Zoom out"
            >
              <MaterialIcons
                name="zoom-out"
                size={22}
                color={canZoomOut ? '#333' : '#CCC'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onResetZoom}
              disabled={!canZoomOut}
              accessibilityLabel="Reset zoom to fit"
            >
              <Text style={styles.zoomLabel}>
                {Math.round((zoom?.scale ?? 1) * 100)}%
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={onZoomIn}
              disabled={!canZoomIn}
              accessibilityLabel="Zoom in"
            >
              <MaterialIcons
                name="zoom-in"
                size={22}
                color={canZoomIn ? '#333' : '#CCC'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={onFitWidth}
              accessibilityLabel="Fit width"
            >
              <MaterialIcons name="swap-horiz" size={22} color="#333" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={onFitHeight}
              accessibilityLabel="Fit height"
            >
              <MaterialIcons name="swap-vert" size={22} color="#333" />
            </TouchableOpacity>
          </View>
        )}

        {!isPdf && (
          <View style={styles.iconButton}>
            <PreferencesEditor
              preferences={preferences}
              onChange={onPreferencesChange}
            />
          </View>
        )}

        <View style={styles.iconButton}>
          <TableOfContents items={toc} onPress={onNavigateToTocItem} />
        </View>

        <View style={styles.iconButton}>
          <HighlightManager
            highlights={highlights}
            onDeleteHighlight={onDeleteHighlight}
            onNavigateToHighlight={onNavigateToHighlight}
            onEditHighlight={onEditHighlight}
          />
        </View>

        <View style={styles.iconButton}>
          <SearchPanel
            searchResults={searchResults}
            isSearching={isSearching}
            isLoadingMore={isLoadingMoreResults}
            isSearchSupported={isSearchSupported}
            hasMore={hasMoreSearchResults}
            onSearch={onSearch}
            onLoadMore={onLoadMoreSearchResults}
            onClearSearch={onClearSearch}
            onNavigateToResult={onNavigateToHighlight}
          />
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={onClearBook}
          accessibilityLabel="Clear book"
        >
          <MaterialIcons name="close" size={22} color="#999" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zoomLabel: {
    fontSize: 13,
    color: '#666',
    width: 44,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type {
  ReadiumProps,
  Link,
  Decoration,
  Locator,
  SearchResult,
  SearchOptions,
} from 'react-native-readium';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TableOfContents } from './TableOfContents';
import { PreferencesEditor } from './PreferencesEditor';
import { HighlightManager } from './highlights';
import { BookmarkManager } from './BookmarkManager';
import { SearchModal } from './SearchModal';
import { DebugModal } from './DebugModal';
import type { Bookmark } from '../types/reader.types';
import type { ReaderHandle } from './Reader';
import { palette, radii, space, typography } from '../styles/theme';

interface ControlBarProps {
  preferences: ReadiumProps['preferences'];
  onPreferencesChange: (preferences: ReadiumProps['preferences']) => void;
  toc: Link[] | null;
  onNavigateToTocItem: (item: Link) => void;
  highlights: Decoration[];
  onDeleteHighlight: (id: string) => void;
  onNavigateToHighlight: (locator: Locator) => void;
  onEditHighlight: (highlight: Decoration) => void;
  bookmarks: Bookmark[];
  bookmarksLoading: boolean;
  bookmarksError: Error | null;
  currentLocation?: Locator;
  isCurrentBookmarked: boolean;
  onAddBookmark: (locator: Locator) => void;
  onDeleteBookmark: (id: string) => void;
  onNavigateToBookmark: (locator: Locator) => void;
  onClearBook: () => void;
  onClose: () => void;
  title?: string;
  onSearch: (query: string, options?: SearchOptions) => Promise<SearchResult[]>;
  onCancelSearch: () => void;
  onNavigate: (locator: Locator) => void;
  readerHandle: ReaderHandle | null;
}

const progressPercent = (loc?: Locator) => {
  const p = loc?.locations?.totalProgression;
  if (typeof p !== 'number' || Number.isNaN(p)) return null;
  return Math.max(0, Math.min(100, Math.round(p * 100)));
};

export const ControlBar: React.FC<ControlBarProps> = ({
  preferences,
  onPreferencesChange,
  toc,
  onNavigateToTocItem,
  highlights,
  onDeleteHighlight,
  onNavigateToHighlight,
  onEditHighlight,
  bookmarks,
  bookmarksLoading,
  bookmarksError,
  currentLocation,
  isCurrentBookmarked,
  onAddBookmark,
  onDeleteBookmark,
  onNavigateToBookmark,
  onClearBook,
  onClose,
  title,
  onSearch,
  onCancelSearch,
  onNavigate,
  readerHandle,
}) => {
  const insets = useSafeAreaInsets();
  const percent = progressPercent(currentLocation);
  const chapter = currentLocation?.title;

  return (
    <View style={[styles.container, { paddingTop: insets.top + space.xs }]}>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.iconSlot}
          onPress={onClose}
          accessibilityLabel="Close reader"
        >
          <MaterialIcons
            name="keyboard-arrow-down"
            size={26}
            color={palette.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          {title ? (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {chapter ? (
            <Text style={styles.chapter} numberOfLines={1}>
              {chapter}
            </Text>
          ) : null}
        </View>

        <View style={styles.controls}>
          <View style={styles.iconSlot}>
            <SearchModal
              onSearch={onSearch}
              onCancel={onCancelSearch}
              onNavigate={onNavigate}
              onSelectResult={readerHandle?.setSelection}
            />
          </View>

          <View style={styles.iconSlot}>
            <PreferencesEditor
              preferences={preferences}
              onChange={onPreferencesChange}
            />
          </View>

          <View style={styles.iconSlot}>
            <TableOfContents items={toc} onPress={onNavigateToTocItem} />
          </View>

          <View style={styles.iconSlot}>
            <HighlightManager
              highlights={highlights}
              onDeleteHighlight={onDeleteHighlight}
              onNavigateToHighlight={onNavigateToHighlight}
              onEditHighlight={onEditHighlight}
            />
          </View>

          <View style={styles.iconSlot}>
            <BookmarkManager
              bookmarks={bookmarks}
              isLoading={bookmarksLoading}
              error={bookmarksError}
              currentLocation={currentLocation}
              isCurrentBookmarked={isCurrentBookmarked}
              onAddBookmark={onAddBookmark}
              onDeleteBookmark={onDeleteBookmark}
              onNavigateToBookmark={onNavigateToBookmark}
            />
          </View>

          <View style={styles.iconSlot}>
            <DebugModal handle={readerHandle} />
          </View>

          <TouchableOpacity
            style={styles.iconSlot}
            onPress={onClearBook}
            accessibilityLabel="Clear book"
          >
            <MaterialIcons
              name="close"
              size={20}
              color={palette.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {percent !== null ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percent}%` }]} />
        </View>
      ) : (
        <View style={styles.divider} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.surface,
    paddingBottom: space.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.xs,
    minHeight: 48,
  },
  iconSlot: {
    width: 36,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: space.sm,
    alignItems: 'center',
  },
  title: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: palette.textPrimary,
  },
  chapter: {
    fontSize: 11,
    color: palette.textTertiary,
    marginTop: 1,
    maxWidth: '100%',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
  },
  progressTrack: {
    height: 2,
    backgroundColor: palette.surfaceMuted,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.accent,
    borderTopRightRadius: radii.xs,
    borderBottomRightRadius: radii.xs,
  },
});

import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { Locator, SearchResult, SearchOptions } from 'react-native-readium';
import { ReaderButton } from './ReaderButton';

export interface SearchPanelProps {
  searchResults: SearchResult[];
  isSearching: boolean;
  isLoadingMore: boolean;
  isSearchSupported: boolean;
  hasMore: boolean;
  onSearch: (query: string, options?: SearchOptions) => void;
  onLoadMore: () => void;
  onClearSearch: () => void;
  onNavigateToResult: (locator: Locator) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  searchResults,
  isSearching,
  isLoadingMore,
  isSearchSupported,
  hasMore,
  onSearch,
  onLoadMore,
  onClearSearch,
  onNavigateToResult,
}) => {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleOpen = useCallback(() => setVisible(true), []);

  const handleClose = useCallback(() => {
    setVisible(false);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setHasSearched(true);
    onSearch(trimmed);
  }, [query, onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setHasSearched(false);
    onClearSearch();
    inputRef.current?.focus();
  }, [onClearSearch]);

  const renderResult = useCallback(
    ({ item, index }: { item: SearchResult; index: number }) => {
      const highlight = item.highlight ?? item.locator.text?.highlight;
      const normalize = (s: string) =>
        s.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ');

      const rawBefore = item.before ? normalize(item.before).trimStart() : undefined;
      const rawAfter = item.after ? normalize(item.after).trimEnd() : undefined;

      const before = rawBefore
        ? rawBefore.length > 50
          ? `…${rawBefore.slice(-50)}`
          : rawBefore
        : undefined;
      const after = rawAfter
        ? rawAfter.length > 50
          ? `${rawAfter.slice(0, 50)}…`
          : rawAfter
        : undefined;
      const hasTextContext = before || highlight || after;

      const position = item.locator.locations?.position;
      const totalProgression = item.locator.locations?.totalProgression;
      const positionLabel =
        position != null
          ? `p. ${Math.round(position)}`
          : totalProgression != null
          ? `${Math.round(totalProgression * 100)}%`
          : undefined;

      return (
        <TouchableOpacity
          style={styles.resultItem}
          onPress={() => {
            onNavigateToResult(item.locator);
            handleClose();
          }}
          accessibilityLabel={`Search result ${index + 1}: ${
            highlight ?? query
          }`}
        >
          <Text style={styles.resultText} numberOfLines={4}>
            {!hasTextContext ? (
              <Text style={styles.resultHighlight}>{query}</Text>
            ) : null}
            {hasTextContext && before ? (
              <Text style={styles.resultContext}>{before}</Text>
            ) : null}
            {hasTextContext && highlight ? (
              <Text style={styles.resultHighlight}>{highlight}</Text>
            ) : null}
            {hasTextContext && after ? (
              <Text style={styles.resultContext}>{after}</Text>
            ) : null}
          </Text>
          {positionLabel ? (
            <Text style={styles.resultPosition} numberOfLines={1}>
              {positionLabel}
            </Text>
          ) : null}
        </TouchableOpacity>
      );
    },
    [onNavigateToResult, handleClose, query]
  );

  const keyExtractor = useCallback(
    (item: SearchResult, index: number) =>
      `${item.locator.href}-${item.locator.locations?.progression ?? ''}-${index}`,
    []
  );

  const renderBody = () => {
    if (!isSearchSupported) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="search-off" size={48} color="#CCC" />
          <Text style={styles.emptyTitle}>Search not available</Text>
          <Text style={styles.emptyMessage}>
            This format does not support text search.
          </Text>
        </View>
      );
    }

    if (isSearching) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#555" />
          <Text style={styles.emptyMessage}>Searching…</Text>
        </View>
      );
    }

    if (hasSearched && searchResults.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="find-in-page" size={48} color="#CCC" />
          <Text style={styles.emptyTitle}>No results</Text>
          <Text style={styles.emptyMessage}>
            No matches found for "{query}"
          </Text>
        </View>
      );
    }

    if (searchResults.length > 0) {
      return (
        <>
          <FlatList
            data={searchResults}
            renderItem={renderResult}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            onEndReached={hasMore ? onLoadMore : undefined}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isLoadingMore ? (
                <ActivityIndicator
                  style={styles.footerSpinner}
                  size="small"
                  color="#555"
                />
              ) : null
            }
          />
        </>
      );
    }

    return (
      <View style={styles.emptyState}>
        <MaterialIcons name="search" size={48} color="#CCC" />
        <Text style={styles.emptyMessage}>
          Type a word or phrase and tap search
        </Text>
      </View>
    );
  };

  return (
    <>
      <ReaderButton size={35} name="search" onPress={handleOpen} />

      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <View style={styles.container}>
          {Platform.OS === 'ios' ? (
            <View style={styles.dragIndicatorWrapper}>
              <View style={styles.dragIndicator} />
            </View>
          ) : null}
          <View style={styles.header}>
            <View style={styles.inputRow}>
              <MaterialIcons
                name="search"
                size={20}
                color="#666"
                style={styles.searchIcon}
              />
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSubmit}
                placeholder="Search book…"
                placeholderTextColor="#AAA"
                returnKeyType="search"
                autoFocus
                autoCorrect={false}
                autoCapitalize="none"
              />
              {query.length > 0 ? (
                <TouchableOpacity
                  onPress={handleClear}
                  style={styles.clearButton}
                >
                  <MaterialIcons name="close" size={18} color="#666" />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.doneButton}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          {renderBody()}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  dragIndicatorWrapper: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0D0D0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 8,
  },
  inputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 38,
  },
  searchIcon: {
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  doneButton: {
    paddingHorizontal: 4,
  },
  doneText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  list: {
    paddingBottom: 24,
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  resultText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  resultContext: {
    color: '#777',
  },
  resultHighlight: {
    color: '#222',
    fontWeight: '700',
    backgroundColor: '#FFF3A3',
  },
  resultPosition: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  footerSpinner: {
    paddingVertical: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#444',
  },
  emptyMessage: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
  },
});

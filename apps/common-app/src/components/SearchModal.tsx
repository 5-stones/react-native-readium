import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { Locator, SearchResult } from 'react-native-readium';

import { BaseModal } from './BaseModal';
import { ReaderButton } from './ReaderButton';
import { modalStyles } from '../styles/modal';
import { palette, radii, space, typography } from '../styles/theme';

interface SearchModalProps {
  onSearch: (query: string) => Promise<SearchResult[]>;
  onCancel: () => void;
  onNavigate: (locator: Locator) => void;
  /** Optional. If provided, replaces plain navigation — navigates AND selects the match. */
  onSelectResult?: (locator: Locator) => Promise<boolean>;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  onSearch,
  onCancel,
  onNavigate,
  onSelectResult,
}) => {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [errored, setErrored] = useState<string | null>(null);
  const tokenRef = useRef(0);

  const handleClose = useCallback(() => {
    onCancel();
    setVisible(false);
  }, [onCancel]);

  const performSearch = useCallback(
    async (next: string) => {
      const token = ++tokenRef.current;
      setSearching(true);
      setErrored(null);
      try {
        const list = await onSearch(next);
        if (token !== tokenRef.current) return;
        setResults(list);
      } catch (e) {
        if (token !== tokenRef.current) return;
        setErrored(e instanceof Error ? e.message : String(e));
        setResults([]);
      } finally {
        if (token === tokenRef.current) setSearching(false);
      }
    },
    [onSearch]
  );

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    performSearch(trimmed);
  }, [query, performSearch]);

  const handleResultPress = useCallback(
    (result: SearchResult) => {
      setVisible(false);
      if (onSelectResult) {
        onSelectResult(result.locator).catch(() => {
          // Fall back to plain navigation if selection fails.
          onNavigate(result.locator);
        });
      } else {
        onNavigate(result.locator);
      }
    },
    [onNavigate, onSelectResult]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setErrored(null);
    onCancel();
  }, [onCancel]);

  return (
    <>
      <ReaderButton size={22} name="search" onPress={() => setVisible(true)} />

      <BaseModal visible={visible} title="Search" onClose={handleClose}>
        <View style={styles.inputRow}>
          <MaterialIcons
            name="search"
            size={18}
            color={palette.textTertiary}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search in this book…"
            placeholderTextColor={palette.textTertiary}
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <TouchableOpacity
              onPress={handleClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons
                name="close"
                size={18}
                color={palette.textTertiary}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.meta}>
          {searching ? (
            <View style={styles.metaRow}>
              <ActivityIndicator size="small" color={palette.textSecondary} />
              <Text style={styles.metaText}>Searching…</Text>
            </View>
          ) : errored ? (
            <Text style={[styles.metaText, { color: palette.destructive }]}>
              {errored}
            </Text>
          ) : query.trim().length === 0 ? (
            <Text style={styles.metaText}>
              Type a query and tap return.
            </Text>
          ) : (
            <Text style={styles.metaText}>
              {results.length === 1
                ? '1 result'
                : `${results.length} results`}
            </Text>
          )}
        </View>

        {results.map((result) => (
          <TouchableOpacity
            key={`${result.index}-${result.locator.href}`}
            style={modalStyles.cardItem}
            activeOpacity={0.7}
            onPress={() => handleResultPress(result)}
          >
            {result.title ? (
              <Text style={styles.resultTitle} numberOfLines={1}>
                {result.title}
              </Text>
            ) : null}
            {result.snippet ? (
              <Text style={styles.snippet} numberOfLines={3}>
                {result.snippet}
              </Text>
            ) : (
              <Text style={styles.snippet} numberOfLines={2}>
                {result.locator.text?.highlight ||
                  result.locator.title ||
                  result.locator.href}
              </Text>
            )}
            <Text style={styles.resultMeta}>#{result.index + 1}</Text>
          </TouchableOpacity>
        ))}
      </BaseModal>
    </>
  );
};

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: palette.textPrimary,
    paddingVertical: 0,
  },
  meta: {
    paddingVertical: space.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  metaText: {
    ...typography.small,
    color: palette.textTertiary,
  },
  resultTitle: {
    ...typography.bodyStrong,
    marginBottom: space.xs,
  },
  snippet: {
    ...typography.small,
    color: palette.textSecondary,
    lineHeight: 19,
  },
  resultMeta: {
    fontSize: 11,
    color: palette.textTertiary,
    marginTop: space.sm,
  },
});

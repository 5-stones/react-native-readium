import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import type { SearchResult, SearchResultsEvent, SearchOptions } from 'react-native-readium';

export interface UseSearchResult {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  isSupported: boolean;
  setQuery: (q: string) => void;
  handleSearchResults: (event: SearchResultsEvent) => void;
  markSearching: () => void;
  clear: () => void;
}

export const useSearch = (): UseSearchResult => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSupported, setIsSupported] = useState(Platform.OS !== 'web');

  const handleSearchResults = useCallback((event: SearchResultsEvent) => {
    setResults(event.results);
    setIsSupported(event.isSupported);
    setIsSearching(false);
  }, []);

  const markSearching = useCallback(() => {
    setIsSearching(true);
    setResults([]);
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsSearching(false);
    setIsSupported(Platform.OS !== 'web');
  }, []);

  return {
    query,
    results,
    isSearching,
    isSupported,
    setQuery,
    handleSearchResults,
    markSearching,
    clear,
  };
};

export type { SearchResult, SearchOptions };

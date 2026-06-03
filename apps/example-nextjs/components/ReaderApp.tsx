'use client';

import { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen, ReaderBottomSheet } from 'common-app';
import type { BookOption } from 'common-app';

import { configureRNVI } from '../utils/configureRNVI';
import { usePersistedPreferences } from '../hooks/usePersistedPreferences';

const SELECTED_BOOK_KEY = 'selected-book-id';

const books: BookOption[] = [
  {
    id: 'brothers-karamazov',
    title: 'The Brothers Karamazov',
    author: 'Fyodor Dostoevsky',
    asset: '/the-brothers-karamazov_epub/manifest.json',
  },
  {
    id: 'alice-in-wonderland',
    title: "Alice's Adventures in Wonderland",
    author: 'Lewis Carroll',
    asset: 'https://alice.dita.digital/manifest.json',
  },
  {
    id: 'moby-dick',
    title: 'Moby Dick',
    author: 'Herman Melville',
    asset: '/moby-dick_epub/manifest.json',
  },
  {
    id: 'sense-and-sensibility',
    title: 'Sense and Sensibility (PDF)',
    author: 'Jane Austen',
    // Served from this app's public/ dir so it is same-origin. pdf.js fetches
    // the bytes over XHR, so a cross-origin PDF without CORS headers (as
    // gutenberg.org serves) cannot be read on web at all.
    asset: '/sense-and-sensibility.pdf',
  },
];

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
});

export default function ReaderApp() {
  const [isMounted, setIsMounted] = useState(false);
  // Restore previously selected book on refresh for theme persistence testing
  const [sheetOpen, setSheetOpen] = useState(() => {
    try {
      return !!localStorage.getItem(SELECTED_BOOK_KEY);
    } catch { return false; }
  });
  const [selectedBook, setSelectedBook] = useState<BookOption | null>(() => {
    try {
      const id = localStorage.getItem(SELECTED_BOOK_KEY);
      return id ? books.find((b) => b.id === id) ?? null : null;
    } catch { return null; }
  });
  const { initialPreferences, handlePreferencesChange } = usePersistedPreferences();


  useEffect(() => {
    const setup = async () => {
      configureRNVI();
      setIsMounted(true);
    };

    void setup();
  }, []);

  const handleSelectBook = useCallback((book: BookOption) => {
    setSelectedBook(book);
    setSheetOpen(true);
    try { localStorage.setItem(SELECTED_BOOK_KEY, book.id); } catch {}
  }, []);

  const handleClearBook = useCallback(() => {
    setSelectedBook(null);
    try { localStorage.removeItem(SELECTED_BOOK_KEY); } catch {}
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSheetOpen(false);
    setSelectedBook(null);
    try { localStorage.removeItem(SELECTED_BOOK_KEY); } catch {}
  }, []);

  if (!isMounted) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 0, height: 0 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <HomeScreen books={books} onSelectBook={handleSelectBook} />
        {sheetOpen && (
          <ReaderBottomSheet
            key={selectedBook?.id ?? 'empty'}
            book={selectedBook}
            onClearBook={handleClearBook}
            onClose={handleCloseSheet}
            initialPreferences={initialPreferences}
            onPreferencesChange={handlePreferencesChange}
          />
        )}
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

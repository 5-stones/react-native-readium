'use client';

import { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen, ReaderBottomSheet } from 'common-app';
import type { BookOption } from 'common-app';

import { configureRNVI } from '../utils/configureRNVI';

const books: BookOption[] = [
  {
    id: 'brothers-karamazov',
    title: 'The Brothers Karamazov',
    author: 'Fyodor Dostoevsky',
    epubUrl:
      'https://ott-5stones-staging-assets.b-cdn.net/assets/public/fyodor-dostoevsky-the-brothers-karamazov-constance-garnett_epub/none/manifest.json',
  },
  {
    id: 'alice-in-wonderland',
    title: "Alice's Adventures in Wonderland",
    author: 'Lewis Carroll',
    epubUrl: 'https://alice.dita.digital/manifest.json',
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookOption | null>(null);

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
  }, []);

  const handleClearBook = useCallback(() => {
    setSelectedBook(null);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSheetOpen(false);
    setSelectedBook(null);
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
          />
        )}
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

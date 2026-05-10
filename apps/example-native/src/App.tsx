import React, { useState, useCallback } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen, ReaderBottomSheet, RNFS } from 'common-app';
import type { BookOption } from 'common-app';

const books: BookOption[] = [
  {
    id: 'moby-dick',
    title: 'Moby Dick',
    author: 'Herman Melville',
    url: 'https://www.gutenberg.org/ebooks/2701.epub3.images',
    path: `${RNFS.DocumentDirectoryPath}/moby-dick.epub`,
  },
  {
    id: 'confessions',
    title: 'The Confessions of St. Augustine',
    author: 'Augustine of Hippo',
    url: 'https://www.gutenberg.org/ebooks/3296.epub3.images',
    path: `${RNFS.DocumentDirectoryPath}/confessions.epub`,
  },
  {
    id: 'brothers-karamazov',
    title: 'The Brothers Karamazov',
    author: 'Fyodor Dostoevsky',
    bundledAsset: 'the-brothers-karamazov.epub',
    path: `${RNFS.DocumentDirectoryPath}/the-brothers-karamazov.epub`,
  },
  {
    id: 'bobby-make-believe',
    title: 'Bobby Make-Believe',
    author: 'Frank King',
    format: 'cbz',
    bundledAsset: 'bobby_make_believe_sample.cbz',
    path: `${RNFS.DocumentDirectoryPath}/bobby_make_believe_sample.cbz`,
  },
];

export default function App() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookOption | null>(null);

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

  return (
    <SafeAreaProvider>
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

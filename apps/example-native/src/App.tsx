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
    epubUrl: 'https://www.gutenberg.org/ebooks/2701.epub3.images',
    epubPath: `${RNFS.DocumentDirectoryPath}/moby-dick.epub`,
  },
  {
    id: 'confessions',
    title: 'The Confessions of St. Augustine',
    author: 'Augustine of Hippo',
    epubUrl: 'https://www.gutenberg.org/ebooks/3296.epub3.images',
    epubPath: `${RNFS.DocumentDirectoryPath}/confessions.epub`,
  },
  {
    id: 'brothers-karamazov',
    title: 'The Brothers Karamazov',
    author: 'Fyodor Dostoevsky',
    bundledAsset: 'the-brothers-karamazov.epub',
    epubPath: `${RNFS.DocumentDirectoryPath}/the-brothers-karamazov.epub`,
  },
  {
    id: 'mi-may-newsletter',
    title: 'MI May Newsletter',
    author: 'Militia Immaculatae',
    epubUrl: 'https://militiaoftheimmaculata.com/wp-content/uploads/2020/06/2026-MAY-E-Pub-final-web.pdf',
  },
  {
    id: 'mi-june-newsletter',
    title: 'MI June Newsletter',
    author: 'Militia Immaculatae',
    epubUrl: 'https://militiaoftheimmaculata.com/wp-content/uploads/2020/06/2026-JUNE-E-Pub-final-pages-web.pdf',
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

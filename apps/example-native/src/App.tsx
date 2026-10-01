import React, { useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen, ReaderBottomSheet } from 'common-app';
import type { BookOption } from 'common-app';

import {
  LcpPanel,
  LicenseModal,
  PassphrasePrompt,
  useLcp,
} from './lcp';
import { TabBar } from './TabBar';
import type { Tab } from './TabBar';
import type { LcpClientKind } from './lcp';

const books: BookOption[] = [
  {
    id: 'moby-dick',
    title: 'Moby Dick',
    author: 'Herman Melville',
    asset: 'https://www.gutenberg.org/ebooks/2701.epub3.images',
  },
  {
    id: 'confessions',
    title: 'The Confessions of St. Augustine',
    author: 'Augustine of Hippo',
    asset: 'https://www.gutenberg.org/ebooks/3296.epub3.images',
  },
  {
    id: 'svg-in-spine',
    title: 'SVG In Spine (Fixed Layout)',
    author: 'Unknown',
    asset: 'svg-in-spine.epub',
  },
  {
    id: 'brothers-karamazov',
    title: 'The Brothers Karamazov',
    author: 'Fyodor Dostoevsky',
    asset: 'the-brothers-karamazov.epub',
  },
  {
    id: 'sense-and-sensibility',
    title: 'Sense and Sensibility (PDF)',
    author: 'Jane Austen',
    asset: 'sense-and-sensibility.pdf',
  },
  // LCP test books, passphrase "test". Debug builds open them without liblcp, through the
  // basic-profile client in ios/BasicProfileLCPClient.swift and android/app/src/lcpTestClient.
  {
    id: 'lcp-daisy',
    title: 'Daisy (LCP PDF)',
    author: 'EDRLab test license · passphrase "test"',
    asset: 'lcp-daisy.lcpdf',
    protection: 'lcp',
  },
  {
    id: 'lcp-moby-dick',
    title: 'Moby Dick (LCP EPUB)',
    author: 'Basic-profile fixture · passphrase "test"',
    asset: 'lcp-moby-dick.epub',
    protection: 'lcp',
  },
];

interface AppProps {
  /** Set by native code; see AppDelegate.swift and MainActivity.kt. */
  lcpClient?: LcpClientKind;
}

export default function App({ lcpClient = 'none' }: AppProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookOption | null>(null);
  const [licenseBook, setLicenseBook] = useState<BookOption | null>(null);
  const [tab, setTab] = useState<Tab>('library');
  const lcp = useLcp();
  const libraryBooks = books.filter((book) => !book.protection);
  const lcpBooks = [
    ...books.filter((book) => book.protection === 'lcp'),
    ...lcp.books,
  ];

  const handleSelectBook = useCallback((book: BookOption) => {
    setSelectedBook(book);
    setSheetOpen(true);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSheetOpen(false);
    setSelectedBook(null);
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.root}>
          {tab === 'library' ? (
            <HomeScreen books={libraryBooks} onSelectBook={handleSelectBook} />
          ) : (
            <HomeScreen
              title="Readium LCP"
              books={lcpBooks}
              onSelectBook={handleSelectBook}
              header={
                <LcpPanel
                  status={lcp.status}
                  client={lcpClient}
                  error={lcp.error}
                  books={lcpBooks}
                  progress={lcp.progress}
                  notice={lcp.notice}
                  onAcquire={lcp.acquire}
                  onForgetPassphrases={lcp.forgetPassphrases}
                  onShowLicense={setLicenseBook}
                />
              }
            />
          )}
        </View>
        <TabBar selected={tab} onSelect={setTab} />
        {sheetOpen && (
          <ReaderBottomSheet
            key={selectedBook?.id ?? 'empty'}
            book={selectedBook}
            onClose={handleCloseSheet}
          />
        )}
        <LicenseModal
          book={licenseBook}
          onClose={() => setLicenseBook(null)}
          onRemove={lcp.remove}
        />
        <PassphrasePrompt
          request={lcp.prompt}
          onSubmit={lcp.submitPassphrase}
          onCancel={lcp.cancelPassphrase}
        />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

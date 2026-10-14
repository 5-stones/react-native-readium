import React, { useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen, ReaderBottomSheet, books } from 'common-app';
import type { BookOption } from 'common-app';

import { LcpPanel, LicenseModal, PassphrasePrompt, useLcp } from './lcp';
import { TabBar } from './TabBar';
import type { Tab } from './TabBar';
import type { LcpClientKind } from './lcp';


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

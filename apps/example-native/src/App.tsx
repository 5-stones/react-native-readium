import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { HomeScreen, ReaderScreen, BookDetailsScreen, RNFS } from 'common-app';
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
    bundledAsset: require('../resources/the-brothers-karamazov.epub'),
    epubPath: `${RNFS.DocumentDirectoryPath}/the-brothers-karamazov.epub`,
  },
  {
    // Pure audiobook: a single streamed narration track (LibriVox recording of
    // Flatland) played via expo-audio. react-native-readium's audio navigator
    // doesn't reliably stream remote audiobooks, so audio is driven directly.
    id: 'flatland',
    title: 'Flatland',
    author: 'Edwin A. Abbott',
    narrator: 'Read by Ruth Golding (LibriVox)',
    kind: 'audiobook',
    audioUrl:
      'https://archive.org/download/flatland_rg_librivox/flatland_1_abbott.mp3',
  },
  {
    // Read-along: EPUB text shown by readium + a matching LibriVox narration
    // played independently (expo-audio). react-native-readium has no Media
    // Overlays support, so the audio isn't word-synced — it just plays alongside.
    id: 'moby-dick-readalong',
    title: 'Moby Dick (Read Along)',
    author: 'Herman Melville',
    narrator: 'LibriVox narration · chs. 1–2',
    kind: 'readalong',
    epubUrl:
      'https://github.com/IDPF/epub3-samples/releases/download/20230704/moby-dick-mo.epub',
    epubPath: `${RNFS.DocumentDirectoryPath}/moby-dick-mo.epub`,
    audioUrl:
      'https://archive.org/download/moby_dick_librivox/mobydick_001_002_melville_64kb.mp3',
  },
];

type RootStackParamList = {
  Bookshelf: undefined;
  Reader: { bookId: string };
  BookDetails: { bookId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const findBook = (bookId: string) => books.find((b) => b.id === bookId) ?? null;

function BookshelfRoute({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Bookshelf'>) {
  return (
    <HomeScreen
      books={books}
      onSelectBook={(book) =>
        navigation.navigate('Reader', { bookId: book.id })
      }
    />
  );
}

function ReaderRoute({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Reader'>) {
  const book = findBook(route.params.bookId);
  if (!book) return null;
  return (
    <ReaderScreen
      book={book}
      onClose={() => navigation.goBack()}
      onShowDetails={() =>
        navigation.navigate('BookDetails', { bookId: book.id })
      }
    />
  );
}

function BookDetailsRoute({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'BookDetails'>) {
  const book = findBook(route.params.bookId);
  if (!book) return null;
  return <BookDetailsScreen book={book} onBack={() => navigation.goBack()} />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Bookshelf" component={BookshelfRoute} />
            <Stack.Screen name="Reader" component={ReaderRoute} />
            <Stack.Screen name="BookDetails" component={BookDetailsRoute} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

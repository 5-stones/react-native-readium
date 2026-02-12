import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Reader, RNFS } from 'common-app';
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
];

const Stack = createNativeStackNavigator();

function ReaderScreen() {
  return (
    <Reader
      epubUrl={books[0]!.epubUrl}
      epubPath={books[0]!.epubPath}
      books={books}
    />
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Reader" component={ReaderScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

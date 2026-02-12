import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Reader, RNFS } from 'common-app';

const Stack = createNativeStackNavigator();

function ReaderScreen() {
  return (
    <Reader
      epubUrl="https://www.gutenberg.org/ebooks/3296.epub3.images"
      epubPath={`${RNFS.DocumentDirectoryPath}/confessions.epub2`}
    />
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Reader">
        <Stack.Screen name="Reader" component={ReaderScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

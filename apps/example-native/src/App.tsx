import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Reader, RNFS } from 'common-app';

const Stack = createNativeStackNavigator();

function ReaderScreen() {
  return (
    <Reader
      epubUrl="https://test.opds.io/assets/moby/file.epub"
      epubPath={`${RNFS.DocumentDirectoryPath}/moby-dick.epub`}
      showPageNumbers={false}
      initialLocation={{
        href: '/OPS/main3.xml',
        title: 'Chapter 2 - The Carpet-Bag',
        type: 'application/xhtml+xml',
        target: 27,
        locations: {
          position: 24,
          progression: 0,
          totalProgression: 0.03392330383480826,
        },
      }}
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

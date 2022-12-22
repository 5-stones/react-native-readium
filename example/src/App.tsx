import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Reader } from './components';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Reader">
        <Stack.Screen name="Reader" component={Reader} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

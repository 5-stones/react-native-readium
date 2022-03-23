import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Reader from './Reader';

export default function App() {
  return (
    <SafeAreaProvider>
      <Reader/>
    </SafeAreaProvider>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Reader } from 'common-app';

import { configureRNVI } from '../utils/configureRNVI';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
});

export default function ReaderApp() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const setup = async () => {
      // Configure vector icons for web
      configureRNVI();
      setIsMounted(true);
    };

    void setup();
  }, []);

  if (!isMounted) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 0, height: 0 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <Reader
        epubUrl={'https://alice.dita.digital/manifest.json'}
        initialLocation={{
          href: 'text/chapter-2.xhtml',
          type: 'text/html',
          title: 'Chapter 2',
          locations: {
            progression: 0,
            totalProgression: 0.2777777777777778,
            position: 6,
          },
        }}
      />
    </SafeAreaProvider>
  );
}

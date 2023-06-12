import React, { createRef, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type {
  BaseReadiumViewRef,
  File,
  Link,
  Locator,
} from 'react-native-readium';
import { ReadiumView, type Settings } from 'react-native-readium';

import {
  DEFAULT_SETTINGS,
  epubPath,
  epubUrl,
  initialLocation,
} from '../consts';
import RNFS from '../utils/RNFS';
import { ReaderButton } from './ReaderButton';
import { Settings as ReaderSettings } from './Settings';
import { TableOfContents } from './TableOfContents';

export const Reader: React.FC = () => {
  const [toc, setToc] = useState<Link[] | null>([]);
  const [file, setFile] = useState<File>();
  const [location, setLocation] = useState<Locator | Link>();
  const [settings, setSettings] = useState<Partial<Settings>>(DEFAULT_SETTINGS);
  const ref = createRef<BaseReadiumViewRef>();

  useEffect(() => {
    async function run() {
      if (Platform.OS === 'web') {
        setFile({
          url: epubUrl,
          initialLocation,
        });
      } else {
        const exists = await RNFS.exists(epubPath);
        if (!exists) {
          console.log(`Downloading file: '${epubUrl}'`);
          const { promise } = RNFS.downloadFile({
            fromUrl: epubUrl,
            toFile: epubPath,
            background: true,
            discretionary: true,
          });

          // Wait for the download to complete
          await promise;
        } else {
          console.log(`File already exists. Skipping download.`);
        }

        setFile({
          url: epubPath,
          initialLocation,
        });
      }
    }

    void run();
  }, []);

  if (file) {
    return (
      <View style={styles.container}>
        <View style={styles.controls}>
          <View style={styles.button}>
            <TableOfContents
              items={toc}
              onPress={(loc) => {
                setLocation(loc);
              }}
            />
          </View>
          <View style={styles.button}>
            <ReaderSettings
              settings={settings}
              onSettingsChanged={(s) => {
                setSettings(s);
              }}
            />
          </View>
        </View>

        <View style={styles.reader}>
          {Platform.OS === 'web' ? (
            <ReaderButton
              name="chevron-left"
              style={{ width: '10%' }}
              onPress={() => ref.current?.prevPage()}
            />
          ) : null}
          <View style={styles.readiumContainer}>
            <ReadiumView
              ref={ref}
              file={file}
              location={location}
              settings={settings}
              onLocationChange={(locator: Locator) => {
                setLocation(locator);
              }}
              onTableOfContents={(links: Link[] | null) => {
                if (links) setToc(links);
              }}
            />
          </View>
          {Platform.OS === 'web' ? (
            <ReaderButton
              name="chevron-right"
              style={{ width: '10%' }}
              onPress={() => ref.current?.nextPage()}
            />
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text>downloading file</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: Platform.OS === 'web' ? '100vh' : '100%',
  },
  reader: {
    flexDirection: 'row',
    width: '100%',
    height: '90%',
  },
  readiumContainer: {
    width: Platform.OS === 'web' ? '80%' : '100%',
    height: '100%',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  button: {
    margin: 10,
  },
});

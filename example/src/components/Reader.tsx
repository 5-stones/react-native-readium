import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, Platform, DimensionValue } from 'react-native';
import {
  ReadiumView,
  Settings,
} from 'react-native-readium';
import type { Link, Locator, File } from 'react-native-readium';

import RNFS from '../utils/RNFS';
import {
  EPUB_URL,
  EPUB_PATH,
  INITIAL_LOCATION,
  DEFAULT_SETTINGS,
} from '../consts';
import { ReaderButton } from './ReaderButton';
import { TableOfContents } from './TableOfContents';
import { Settings as ReaderSettings } from './Settings';

export const Reader: React.FC = () => {
  const [toc, setToc] = useState<Link[] | null>([]);
  const [file, setFile] = useState<File>();
  const [location, setLocation] = useState<Locator | Link>();
  const [settings, setSettings] = useState<Partial<Settings>>(DEFAULT_SETTINGS);
  const ref = useRef<any>();

  useEffect(() => {
    async function run() {

      if (Platform.OS === 'web') {
        setFile({
          url: EPUB_URL,
          initialLocation: INITIAL_LOCATION,
        });
      } else {
        const exists = await RNFS.exists(EPUB_PATH);
        if (!exists) {
          console.log(`Downloading file: '${EPUB_URL}'`);
          const { promise } = RNFS.downloadFile({
            fromUrl: EPUB_URL,
            toFile: EPUB_PATH,
            background: true,
            discretionary: true,
          });

          // wait for the download to complete
          await promise;
        } else {
          console.log('File already exists. Skipping download.');
        }

        setFile({
          url: EPUB_PATH,
          initialLocation: INITIAL_LOCATION,
        });
      }
    }

    run();
  }, []);

  if (file) {
    return (
      <View style={styles.container}>
        <View style={styles.controls}>
          <View style={styles.button}>
            <TableOfContents
              items={toc}
              onPress={(loc) => setLocation({
                href: loc.href,
                type: 'application/xhtml+xml',
                title: loc.title || '',
              })}
            />
          </View>
          <View style={styles.button}>
            <ReaderSettings
              settings={settings}
              onSettingsChanged={(s) => setSettings(s)}
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
              onLocationChange={(locator: Locator) => setLocation(locator)}
              onTableOfContents={(toc: Link[] | null) => {
                if (toc) {setToc(toc);}
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
    height: (Platform.OS === 'web' ? '100vh' : '100%') as DimensionValue,
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

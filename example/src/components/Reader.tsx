import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
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
import { TableOfContents } from './TableOfContents';
import { Settings as ReaderSettings } from './Settings';

export const Reader: React.FC = () => {
  const [toc, setToc] = useState<Link[] | null>([]);
  const [file, setFile] = useState<File>();
  const [location, setLocation] = useState<Locator | Link>();
  const [settings, setSettings] = useState<Partial<Settings>>(DEFAULT_SETTINGS);

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
          console.log(`File already exists. Skipping download.`);
        }

        setFile({
          url: EPUB_PATH,
          initialLocation: INITIAL_LOCATION,
        });
      }
    }

    run()
  }, []);

  if (file) {
    return (
      <View style={styles.container}>
        <View style={styles.controls}>
          <View style={styles.button}>
            <TableOfContents
              items={toc}
              onPress={(loc) => setLocation(loc)}
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
          <ReadiumView
            file={file}
            location={location}
            settings={settings}
            onLocationChange={(locator) => setLocation(locator)}
            onTableOfContents={(toc) => setToc(toc)}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text>downloading file</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: Platform.OS === 'web' ? '100vh' : '100%',
  },
  reader: {
    flex: 1,
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

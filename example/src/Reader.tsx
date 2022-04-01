import React, { useEffect, useState } from 'react';
import RNFS from 'react-native-fs';
import { StyleSheet, View, Text } from 'react-native';
import {
  ReadiumView,
  Settings,
} from 'react-native-readium';
import type { Link, Locator, File } from 'react-native-readium';

import {
  EPUB_URL,
  EPUB_PATH,
  INITIAL_LOCATION,
  DEFAULT_SETTINGS,
} from './consts';
import { TableOfContents } from './TableOfContents';
import { Settings as ReaderSettings } from './Settings';

const Reader: React.FC = () => {
  const [toc, setToc] = useState<Link[] | null>([]);
  const [file, setFile] = useState<File>();
  const [location, setLocation] = useState<Locator>();
  const [settings, setSettings] = useState<Partial<Settings>>(DEFAULT_SETTINGS);

  useEffect(() => {
    async function run() {
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

    run()
  }, []);

  if (file) {
    return (
      <View style={styles.container}>
        <View style={{
          height: '10%',
          flexDirection: 'row',
        }}>
          <TableOfContents
            items={toc}
            onPress={(link) => {
              setLocation({
                href: link.href,
                type: 'application/xhtml+xml',
              });
            }}
          />
          <ReaderSettings
            settings={settings}
            onSettingsChanged={(s) => setSettings(s)}
          />
        </View>
        <View style={{ height: '90%' }}>
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
    marginTop: 50,
  },
  button: {
    backgroundColor: 'darkblue',
    marginHorizontal: 5,
  },
});

export default Reader;

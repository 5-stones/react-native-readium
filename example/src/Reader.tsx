import React, { useEffect, useState } from 'react';
import RNFS from 'react-native-fs';
import { StyleSheet, View, Text } from 'react-native';
import { Button } from 'react-native-elements';
import {
  ReadiumView,
  Settings,
  Appearance,
} from 'react-native-readium';
import type { Locator, File } from 'react-native-readium';

const EPUB_URL = `https://test.opds.io/assets/moby/file.epub`;
const EPUB_PATH = `${RNFS.DocumentDirectoryPath}/moby-dick.epub`;

const defaultSettings = new Settings();
defaultSettings.appearance = Appearance.NIGHT;

const Reader: React.FC = () => {
  const [file, setFile] = useState<File>();
  const [location, setLocation] = useState<Locator>();
  const [settings, setSettings] = useState<Partial<Settings>>(defaultSettings);

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
        initialLocation: {
          href: '/OPS/main3.xml',
          title: 'Chapter 2 - The Carpet-Bag',
          type: 'application/xhtml+xml',
          target: 27,
          locations: {
            position: 24,
            progression: 0,
            totalProgression: 0.03392330383480826
          },
        },
      });
    }

    run()
  }, []);

  if (file) {
    return (
      <View style={styles.container}>
        <View style={{ height: '10%', flexDirection: 'row' }}>
          <Button
            containerStyle={{ flex: 1 }}
            buttonStyle={styles.button}
            title="Update Settings"
            onPress={() => {
              setSettings((s: any) => {
                let ns: Partial<Settings> = { fontSize: 100 };

                if (s) {
                  const max = (s.fontSize + 25) % 300;
                  ns = {
                    ...s,
                    fontSize: max > 100 ? max : 100,
                    appearance: s.fontSize % 2 ? Appearance.NIGHT : Appearance.DEFAULT,
                  };
                }

                return ns;
              })
            }}
          />
          <Button
            containerStyle={{ flex: 1 }}
            buttonStyle={styles.button}
            title="Chapter 3"
            onPress={() => {
              setLocation({
                href: '/OPS/main4.xml',
                title: 'Chapter 3 - The Spouter-Inn',
                type: 'application/xhtml+xml',
                target: 39,
                locations: {
                  position: 29,
                  progression: 0,
                  totalProgression: 0.04129793510324484,
                },
              })
            }}
          />
        </View>
        <View style={{ height: '90%' }}>
          <ReadiumView
            file={file}
            location={location}
            settings={settings}
            onLocationChange={(locator) => setLocation(locator)}
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

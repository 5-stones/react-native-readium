import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, Platform, DimensionValue } from 'react-native';
import { ReadiumView } from 'react-native-readium';
import type { Link, Locator, File, ReadiumProps } from 'react-native-readium';

import RNFS from '../utils/RNFS';
import { ReaderButton } from './ReaderButton';
import { TableOfContents } from './TableOfContents';
import { PreferencesEditor } from './PreferencesEditor';

export interface ReaderProps {
  /** URL to the EPUB file (used for web or downloading on native) */
  epubUrl: string;
  /** Local file path for the EPUB (used on native platforms after download) */
  epubPath?: string;
  /** Initial location to open the book at */
  initialLocation?: Locator;
}

export const Reader: React.FC<ReaderProps> = ({
  epubUrl,
  epubPath,
  initialLocation,
}) => {
  const [toc, setToc] = useState<Link[] | null>([]);
  const [file, setFile] = useState<File>();
  const [location, setLocation] = useState<Locator | Link>();
  const [preferences, setPreferences] = useState<ReadiumProps['preferences']>({
    theme: 'dark',
  });
  const [hidePageNumbers, setHidePageNumbers] = useState<boolean>(false);
  const ref = useRef<any>(undefined);

  useEffect(() => {
    async function run() {
      let url = epubUrl;
      if (epubPath) {
        // For native platforms, use epubPath if provided, otherwise generate from epubUrl
        const localPath =
          epubPath ||
          `${RNFS.DocumentDirectoryPath}/${epubUrl.split('/').pop()}`;

        const exists = await RNFS.exists(localPath);
        if (!exists) {
          console.log(`Downloading file: '${epubUrl}'`);
          const { promise } = RNFS.downloadFile({
            fromUrl: epubUrl,
            toFile: localPath,
            background: true,
            discretionary: true,
          });

          // wait for the download to complete
          await promise;
        } else {
          console.log('File already exists. Skipping download.');
        }

        url = localPath;
      }

      setFile({
        url,
        initialLocation,
      });
    }

    run();
  }, [epubUrl, epubPath, initialLocation]);

  if (file) {
    return (
      <View style={styles.container}>
        <View style={styles.controls}>
          <View style={styles.button}>
            <TableOfContents
              items={toc}
              onPress={(loc) =>
                setLocation({
                  href: loc.href,
                  type: loc.type || 'application/xhtml+xml',
                  title: loc.title || '',
                  locations: {
                    progression: 0,
                  },
                })
              }
            />
          </View>
          <View style={styles.button}>
            <PreferencesEditor
              preferences={preferences}
              onChange={setPreferences}
              hidePageNumbers={hidePageNumbers}
              onHidePageNumbersChange={setHidePageNumbers}
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
              hidePageNumbers={hidePageNumbers}
              preferences={preferences}
              onLocationChange={(locator: Locator) => setLocation(locator)}
              onTableOfContents={(toc: Link[] | null) => {
                if (toc) {
                  setToc(toc);
                }
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

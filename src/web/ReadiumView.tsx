import React from 'react';
import { View, StyleSheet } from 'react-native';

import type { ReadiumProps } from '../components/ReadiumView';
import {
  useReaderRef,
  useSettingsObserver,
  useLocationObserver,
} from './hooks';

export const ReadiumView: React.FC<ReadiumProps> = ({
  file,
  settings,
  location,
  onLocationChange,
  onTableOfContents,
}) => {
  const readerRef = useReaderRef({
    file,
    onLocationChange,
    onTableOfContents,
  });
  const reader = readerRef.current;

  useSettingsObserver(reader, settings);
  useLocationObserver(reader, location);

  return (
    <View style={styles.container}>
      {!reader && <div style={styles.loader}>Loading reader...</div>}
      <div id="D2Reader-Container" style={styles.d2Container}>
        {reader && <button onClick={reader.previousPage} style={styles.button}>&lsaquo;</button>}
        <main
          style={styles.maximize}
          tabIndex={-1}
          id="iframe-wrapper"
        >
          <div id="reader-loading" className="loading" style={styles.loader}></div>
          <div id="reader-error" className="error"></div>
        </main>
        {reader && <button onClick={reader.nextPage} style={styles.button}>&rsaquo;</button>}
      </div>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
  },
  d2Container: {
    width: '100%',
    height: '100%',
    display: 'flex',
  },
  maximize: {
    width: 'calc(100% - 100px)',
    height: '100%',
    display: 'flex',
  },
  button: {
    width: 50,
    fontSize: 100,
    backgroundColor: 'transparent',
    border: 'none',
  },
  loader: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    position: 'relative',
    top: 'calc(50% - 10px)',
  },
});

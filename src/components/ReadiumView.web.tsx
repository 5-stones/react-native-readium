import React, { useImperativeHandle } from 'react';
import type { CSSProperties } from 'react';
import { View, StyleSheet } from 'react-native';

import type { ReadiumProps } from '../components/ReadiumView';
import {
  useReaderRef,
  useSettingsObserver,
  useLocationObserver,
} from '../../web/hooks';

export const ReadiumView = React.forwardRef<
  {
    nextPage: () => void;
    prevPage: () => void;
  },
  ReadiumProps
>(
  (
    {
      file,
      settings,
      location,
      onLocationChange,
      onTableOfContents,
      style = {},
      height,
      width,
    },
    ref
  ) => {
    const readerRef = useReaderRef({
      file,
      onLocationChange,
      onTableOfContents,
    });
    const reader = readerRef.current;

    useImperativeHandle(ref, () => ({
      nextPage: () => {
        readerRef.current?.nextPage();
      },
      prevPage: () => {
        readerRef.current?.previousPage();
      },
    }));

    useSettingsObserver(reader, settings);
    useLocationObserver(reader, location);

    const mainStyle = {
      ...styles.maximize,
      ...(style as CSSProperties),
    };

    if (height) mainStyle.height = height;
    if (width) mainStyle.width = width;

    return (
      <View style={styles.container}>
        {!reader && <div style={loaderStyle}>Loading reader...</div>}
        <div id="D2Reader-Container" style={styles.d2Container}>
          <main style={mainStyle} tabIndex={-1} id="iframe-wrapper">
            <div id="reader-loading" className="loading" style={loaderStyle} />
            <div id="reader-error" className="error" />
          </main>
        </div>
      </View>
    );
  }
);

const loaderStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  textAlign: 'center',
  position: 'relative',
  top: 'calc(50% - 10px)',
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
    width: '100%',
    height: '100%',
    display: 'flex',
  },
});

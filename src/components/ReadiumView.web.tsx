import React, { useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { View, StyleSheet } from 'react-native';

import type { BaseReadiumViewProps, Preferences } from '../interfaces';
import {
  useNavigator,
  usePreferencesObserver,
  useLocationObserver,
} from '../../web/hooks';

export type ReadiumProps = Omit<BaseReadiumViewProps, 'preferences'> & {
  preferences: Preferences;
};

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
      preferences,
      location,
      onLocationChange,
      onTableOfContents,
      style = {},
      height,
      width,
    },
    ref
  ) => {
    const [container, setContainer] = useState<HTMLElement | null>(null);
    const navigator = useNavigator({
      file,
      onLocationChange,
      onTableOfContents,
      container,
    });

    useImperativeHandle(ref, () => ({
      nextPage: () => {
        navigator?.goForward(true, () => {});
      },
      prevPage: () => {
        navigator?.goBackward(true, () => {});
      },
    }), [navigator]);

    usePreferencesObserver(navigator, preferences);
    useLocationObserver(navigator, location);

    const mainStyle = {
      ...styles.maximize,
      ...(style as CSSProperties),
    };

    if (height) mainStyle.height = height;
    if (width) mainStyle.width = width;

    return (
      <View style={styles.container} id="wrapper">
        <style type="text/css">
        {`
          .readium-navigator-iframe {
            width: 100%;
            height: 100%;
            border-width: 0;
          }
        `}
        </style>
        {!navigator && <div style={loaderStyle}>Loading reader...</div>}
        <main
          ref={(el) => setContainer(el)}
          style={styles.readimContainer}
          id="readium-container"
          aria-label="Publication"
        />
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
    display: 'flex',
  },
  readimContainer: {
    // @ts-ignore
    contain: 'content',
    width: '100%',
    height: '100%',
  },
  maximize: {
    width: '100%',
    height: '100%',
    display: 'flex',
  },
});

import React, { useEffect, useImperativeHandle, useState } from 'react';
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
      onPublicationReady,
      hidePageNumbers = false,
      style = {},
      height,
      width,
    },
    ref
  ) => {
    const [container, setContainer] = useState<HTMLElement | null>(null);
    const [currentPosition, setCurrentPosition] = useState<number | null>(null);
    const { navigator, positions } = useNavigator({
      file,
      onLocationChange,
      onPublicationReady,
      container,
      onPositionChange: setCurrentPosition,
    });

    useImperativeHandle(
      ref,
      () => ({
        nextPage: () => {
          navigator?.goForward(true, () => {});
        },
        prevPage: () => {
          navigator?.goBackward(true, () => {});
        },
      }),
      [navigator]
    );

    usePreferencesObserver(navigator, preferences);
    useLocationObserver(navigator, location);

    const shouldShowPositionLabel =
      !hidePageNumbers && !!currentPosition && positions.length > 0;

    // Generate position label text
    const positionLabel = shouldShowPositionLabel
      ? `${currentPosition} / ${positions.length}`
      : null;

    // Manage position label as a child of the readium-container
    useEffect(() => {
      if (!container) return;

      const existingLabel = container.querySelector('.position-label');

      if (positionLabel) {
        if (!existingLabel) {
          const label = document.createElement('div');
          label.className = 'position-label';
          label.setAttribute('aria-live', 'polite');
          label.textContent = positionLabel;
          container.appendChild(label);
        } else {
          existingLabel.textContent = positionLabel;
        }
      } else if (existingLabel) {
        existingLabel.remove();
      }

      // Cleanup function
      return () => {
        const label = container.querySelector('.position-label');
        if (label) {
          label.remove();
        }
      };
    }, [container, positionLabel]);

    const mainStyle = {
      ...styles.maximize,
      ...(style as CSSProperties),
    };

    if (height) mainStyle.height = height;
    if (width) mainStyle.width = width;

    // Determine theme colors based on preferences
    // These match the THEME_COLORS defined in usePreferencesObserver.ts
    const getThemeColors = () => {
      const theme = preferences?.theme;
      switch (theme) {
        case 'dark':
          return { background: '#000000', text: '#ffffff' };
        case 'sepia':
          return { background: '#f4ecd8', text: '#5f4b32' };
        case 'light':
        default:
          return { background: '#ffffff', text: '#000000' };
      }
    };

    const themeColors = getThemeColors();

    return (
      <View style={styles.container} id="wrapper">
        <style type="text/css">
          {`
          .readium-navigator-iframe {
            width: 100%;
            height: ${positionLabel ? 'calc(100% - 50px)' : '100%'};
            border-width: 0;
          }

          #readium-container {
            position: relative;
            padding-bottom: ${positionLabel ? '50px' : '0px'};
            box-sizing: border-box;
            background-color: ${themeColors.background};
          }

          .position-label {
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 14px;
            color: ${themeColors.text};
            background: transparent;
            padding: 5px 10px;
            z-index: 1000;
            pointer-events: none;
            user-select: none;
          }
        `}
        </style>
        {!navigator && <div style={loaderStyle}>Loading reader...</div>}
        <main
          ref={(el) => setContainer(el)}
          style={styles.readiumContainer}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  readiumContainer: {
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

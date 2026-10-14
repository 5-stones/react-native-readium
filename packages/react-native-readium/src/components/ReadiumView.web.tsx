import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { View, StyleSheet } from 'react-native';

import {
  useEpubNavigator,
  usePdfNavigator,
  useDecorationsObserver,
} from '../../web/hooks';
import { SelectionActionMenu } from '../../web/components';
import { convertToNavigatorLocator } from '../../web/utils/locationNormalizer';
import { isSupportedPublicationURL } from '../../web/utils/publicationFormat';
import { toPublicationErrorEvent } from '../utils/publicationError';
import type { Preferences } from '../interfaces';
import type {
  ReadiumProps as BaseReadiumProps,
  ReadiumViewRef as BaseReadiumViewRef,
} from './ReadiumView.types';

export type ReadiumProps = BaseReadiumProps & {
  height?: number;
  width?: number;
};

export type ReadiumViewRef = BaseReadiumViewRef & {
  /** @deprecated Use goForward() */
  nextPage: () => void;
  /** @deprecated Use goBackward() */
  prevPage: () => void;
};

/** One object for every render, so effects that depend on `preferences` don't rerun. */
const NO_PREFERENCES: Preferences = {};

export const ReadiumView = React.forwardRef<ReadiumViewRef, ReadiumProps>(
  (
    {
      file,
      resolveSource,
      shouldRefreshSource,
      preferences = NO_PREFERENCES,
      decorations,
      onLocationChange,
      onPublicationReady,
      onPreferencesChanged,
      onPublicationError,
      onDecorationActivated,
      onSelectionChange,
      onSelectionAction,
      selectionActions,
      onZoomChange,
      style = {},
      height,
      width,
    },
    ref
  ) => {
    const [container, setContainer] = useState<HTMLElement | null>(null);
    const [currentPosition, setCurrentPosition] = useState<number | null>(null);

    // Convert DecorationGroup[] to DecorationGroups record for web hooks
    const decorationsRecord = decorations
      ? Object.fromEntries(decorations.map((g) => [g.name, g.decorations]))
      : undefined;

    const {
      navigator: epubNavigator,
      positions,
      selection,
      selectionActions: epubSelectionActions,
      activateSelectionAction,
    } = useEpubNavigator({
      file,
      resolveSource,
      shouldRefreshSource,
      preferences,
      onLocationChange,
      onPublicationReady,
      onPreferencesChanged,
      onPublicationError,
      onSelectionChange,
      onSelectionAction,
      selectionActions,
      container,
      onPositionChange: setCurrentPosition,
    });

    const pdfNavigator = usePdfNavigator({
      file,
      resolveSource,
      // Was never passed, so a PDF's read failures ignored the consumer's
      // policy and fell back to the platform's.
      shouldRefreshSource,
      preferences,
      container,
      onLocationChange,
      onPublicationReady,
      onPreferencesChanged,
      onPublicationError,
      onZoomChange,
      initialPage: 1,
    });

    const navigator = pdfNavigator ? pdfNavigator : epubNavigator;

    useImperativeHandle(
      ref,
      () => ({
        goTo: (locator) => {
          if (!navigator) return;

          if (pdfNavigator) {
            pdfNavigator.goToLocator(locator);
            return;
          }

          const navLocator = convertToNavigatorLocator(locator);
          if (navLocator) {
            // @ts-ignore
            navigator.go(navLocator, true, () => {});
          }
        },
        goForward: () => {
          navigator?.goForward(true, () => {});
        },
        goBackward: () => {
          navigator?.goBackward(true, () => {});
        },
        /* Search not yet supported on web */
        search: () =>
          Promise.resolve({
            results: [],
            hasMore: false,
            totalCount: undefined,
            isSupported: false,
          }),
        loadMoreSearchResults: () =>
          Promise.resolve({
            results: [],
            hasMore: false,
            totalCount: undefined,
            isSupported: false,
          }),
        cancelSearch: () => {},
        zoomIn: () => pdfNavigator?.zoomIn(),
        zoomOut: () => pdfNavigator?.zoomOut(),
        setZoom: (scale) => pdfNavigator?.setZoom(scale),
        resetZoom: () => pdfNavigator?.resetZoom(),
        /** @deprecated Use goForward() */
        nextPage: () => {
          navigator?.goForward(true, () => {});
        },
        /** @deprecated Use goBackward() */
        prevPage: () => {
          navigator?.goBackward(true, () => {});
        },
      }),
      [navigator, pdfNavigator]
    );

    useDecorationsObserver(
      epubNavigator,
      decorationsRecord,
      onDecorationActivated
    );

    // Each navigator decides whether a publication is its own by reading the
    // url, and bails quietly when it isn't. A url neither of them claims would
    // otherwise leave the view on its loading state for good, with nothing
    // reported — so say so here, where both answers are known.
    const url = file?.url;
    // The url already reported for. Keyed on the url rather than left to the
    // effect's dependencies so that `onPublicationError` can be in them: a
    // consumer that attaches its handler a render late (one derived from state,
    // say) would otherwise have had its only notification delivered to
    // undefined, and the view would wait forever — the failure this reports.
    // It also keeps a development double-invoke to a single event.
    const reportedURL = useRef<string | undefined>(undefined);

    useEffect(() => {
      // No url yet is "nothing to open", not a failure.
      if (url === undefined || isSupportedPublicationURL(url)) {
        reportedURL.current = undefined;
        return;
      }

      if (!onPublicationError || reportedURL.current === url) return;
      reportedURL.current = url;

      // An empty url is a missing file, which is how both native platforms
      // report it; a non-empty one no navigator claims is a format we can't
      // open at all.
      const report = url
        ? {
            code: 'formatNotSupported' as const,
            detail:
              `Expected a url ending in 'manifest.json' for an unpacked EPUB, ` +
              `or in '.pdf' for a PDF. Got '${url}'.`,
          }
        : {
            code: 'fileNotFound' as const,
            detail: 'No url was given for the publication.',
          };

      // Neither url opens anything, so both are a failure to open.
      onPublicationError(
        toPublicationErrorEvent({ url, stage: 'open', ...report })
      );
    }, [url, onPublicationError]);

    // Generate position label text
    const positionLabel =
      currentPosition && positions.length > 0
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
    }, [container, positionLabel, currentPosition, positions.length]);

    const mainStyle = {
      ...styles.maximize,
      ...(style as CSSProperties),
    };

    if (height) mainStyle.height = height;
    if (width) mainStyle.width = width;

    // Determine theme colors based on preferences
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

    if (pdfNavigator) {
      return (
        <View style={styles.container} id="wrapper">
          {!pdfNavigator.isReady && (
            <div style={loaderStyle}>Loading reader...</div>
          )}
          <main
            ref={setContainer}
            style={styles.readiumContainer}
            id="readium-container"
            aria-label="Publication"
          />
          {pdfNavigator.isReady && pdfNavigator.pageCount > 0 && (
            <div style={pdfPositionLabelStyle} aria-live="polite">
              {pdfNavigator.pageNumber} / {pdfNavigator.pageCount}
            </div>
          )}
        </View>
      );
    }

    return (
      <View style={styles.container} id="wrapper">
        <style type="text/css">
          {`
          .readium-navigator-iframe {
            width: 100%;
            height: calc(100% - 50px);
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
          ref={setContainer}
          style={styles.readiumContainer}
          id="readium-container"
          aria-label="Publication"
        />
        {selection && (
          <SelectionActionMenu
            actions={epubSelectionActions}
            rect={selection.rect}
            onAction={activateSelectionAction}
          />
        )}
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

const pdfPositionLabelStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 10,
  left: '50%',
  transform: 'translateX(-50%)',
  fontSize: 14,
  background: 'transparent',
  padding: '5px 10px',
  zIndex: 1000,
  pointerEvents: 'none',
  userSelect: 'none',
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

import React, {
  useCallback,
  useEffect,
  useState,
  forwardRef,
  useRef,
  useImperativeHandle,
} from 'react';
import { View, StyleSheet } from 'react-native';
import { callback } from 'react-native-nitro-modules';

import type { Dimensions } from '../interfaces';
import type { PublicationReadyEvent as SpecPublicationReadyEvent } from '../specs/ReadiumView.nitro';
import { toLegacyPublicationReadyEvent } from '../utils/readerParity';
import { NitroReadiumView } from './NitroReadiumView';
export type { ReadiumViewRef, ReadiumProps } from './ReadiumView.types';
import type { ReadiumViewRef, ReadiumProps } from './ReadiumView.types';

export const ReadiumView = forwardRef<ReadiumViewRef, ReadiumProps>(
  (
    {
      onLocationChange,
      onPublicationReady,
      onReady,
      onError,
      onUnsupportedCapability,
      onSearchProgress,
      onDecorationActivated,
      onSelectionChange,
      onSelectionAction,
      onMediaStateChange,
      onMediaError,
      preferences,
      decorations,
      selectionActions,
      ...props
    },
    forwardedRef
  ) => {
    const hybridRef = useRef<any>(null);
    const [{ height, width }, setDimensions] = useState<Dimensions>({
      width: 0,
      height: 0,
    });

    const onLayout = useCallback(
      ({
        nativeEvent: {
          layout: { width: layoutWidth, height: layoutHeight },
        },
      }: any) => {
        setDimensions({
          width: layoutWidth,
          height: layoutHeight,
        });
      },
      []
    );

    const noop = () => {};

    const handlePublicationReady = useCallback(
      (event: SpecPublicationReadyEvent) => {
        if (!onPublicationReady) return;
        onPublicationReady(toLegacyPublicationReadyEvent(event));
      },
      [onPublicationReady]
    );

    useImperativeHandle(
      forwardedRef,
      () => ({
        goTo: (locator) => hybridRef.current?.goTo(locator),
        goForward: () => hybridRef.current?.goForward(),
        goBackward: () => hybridRef.current?.goBackward(),
        getPublication: () => hybridRef.current?.getPublication(),
        getCurrentLocation: () => hybridRef.current?.getCurrentLocation(),
        getCurrentSelection: () => hybridRef.current?.getCurrentSelection(),
        clearSelection: () => hybridRef.current?.clearSelection(),
        setSelection: (locator) => hybridRef.current?.setSelection(locator),
        search: (query, options) => hybridRef.current?.search(query, options),
        cancelSearch: () => hybridRef.current?.cancelSearch(),
        getResource: (href) => hybridRef.current?.getResource(href),
        getPositions: () => hybridRef.current?.getPositions(),
        getTableOfContents: () => hybridRef.current?.getTableOfContents(),
        setPreferences: (nextPreferences) =>
          hybridRef.current?.applyPreferences(nextPreferences),
        setPdfPreferences: (nextPreferences) =>
          hybridRef.current?.setPdfPreferences(nextPreferences),
        setComicPreferences: (nextPreferences) =>
          hybridRef.current?.setComicPreferences(nextPreferences),
        setAudioPreferences: (nextPreferences) =>
          hybridRef.current?.setAudioPreferences(nextPreferences),
        play: () => hybridRef.current?.play(),
        pause: () => hybridRef.current?.pause(),
        stop: () => hybridRef.current?.stop(),
        seekTo: (position) => hybridRef.current?.seekTo(position),
        skipToNext: () => hybridRef.current?.skipToNext(),
        skipToPrevious: () => hybridRef.current?.skipToPrevious(),
        setPlaybackRate: (rate) => hybridRef.current?.setPlaybackRate(rate),
        getMediaState: () => hybridRef.current?.getMediaState(),
      }),
      []
    );

    useEffect(() => {
      return () => {
        hybridRef.current?.destroy();
      };
    }, []);

    const isReady = width > 0 && height > 0;

    return (
      <View style={styles.container} onLayout={onLayout}>
        {isReady && (
          <NitroReadiumView
            style={{ width, height }}
            {...props}
            preferences={preferences}
            decorations={decorations}
            selectionActions={selectionActions ?? []}
            onLocationChange={callback(onLocationChange ?? noop)}
            onPublicationReady={callback(handlePublicationReady)}
            onReady={callback(onReady ?? noop)}
            onError={callback(onError ?? noop)}
            onUnsupportedCapability={callback(onUnsupportedCapability ?? noop)}
            onSearchProgress={callback(onSearchProgress ?? noop)}
            onDecorationActivated={callback(onDecorationActivated ?? noop)}
            onSelectionChange={callback(onSelectionChange ?? noop)}
            onSelectionAction={callback(onSelectionAction ?? noop)}
            onMediaStateChange={callback(onMediaStateChange ?? noop)}
            onMediaError={callback(onMediaError ?? noop)}
            hybridRef={callback((ref: any) => {
              hybridRef.current = ref;
            })}
          />
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: { width: '100%', height: '100%' },
});

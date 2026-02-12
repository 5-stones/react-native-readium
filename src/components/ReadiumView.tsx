import React, {
  useCallback,
  useState,
  forwardRef,
  useRef,
  useImperativeHandle,
} from 'react';
import { View, StyleSheet } from 'react-native';
import { callback } from 'react-native-nitro-modules';

import type { Dimensions } from '../interfaces';
import { NitroReadiumView } from './NitroReadiumView';
export type { ReadiumViewRef, ReadiumProps } from './ReadiumView.types';
import type { ReadiumViewRef, ReadiumProps } from './ReadiumView.types';

export const ReadiumView = forwardRef<ReadiumViewRef, ReadiumProps>(
  (
    {
      onLocationChange,
      onPublicationReady,
      onDecorationActivated,
      onSelectionChange,
      onSelectionAction,
      preferences,
      decorations,
      selectionActions,
      ...props
    },
    forwardedRef
  ) => {
    const nativeRef = useRef<any>(null);
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

    useImperativeHandle(
      forwardedRef,
      () => ({
        goForward: () => nativeRef.current?.goForward(),
        goBackward: () => nativeRef.current?.goBackward(),
      }),
      []
    );

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
            onPublicationReady={callback(onPublicationReady ?? noop)}
            onDecorationActivated={callback(onDecorationActivated ?? noop)}
            onSelectionChange={callback(onSelectionChange ?? noop)}
            onSelectionAction={callback(onSelectionAction ?? noop)}
            ref={nativeRef}
          />
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: { width: '100%', height: '100%' },
});

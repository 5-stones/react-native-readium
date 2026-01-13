import React, {
  useCallback,
  useState,
  useEffect,
  forwardRef,
  useRef,
  useMemo,
} from 'react';
import { View, Platform, StyleSheet } from 'react-native';

import type {
  BaseReadiumViewProps,
  Dimensions,
  Preferences,
} from '../interfaces';
import { getWidthOrHeightValue as dimension } from '../utils';
import { BaseReadiumView } from './BaseReadiumView';
import { Commands } from '../ReadiumViewNativeComponent';

export type ReadiumProps = Omit<BaseReadiumViewProps, 'preferences'> & {
  preferences: Preferences;
};

export const ReadiumView: React.FC<ReadiumProps> = forwardRef(
  (
    {
      onLocationChange: wrappedOnLocationChange,
      onTableOfContents: wrappedOnTableOfContents,
      preferences,
      hidePageNumbers,
      ...props
    },
    forwardedRef
  ) => {
    const defaultRef = useRef<any>(null);
    const [{ height, width }, setDimensions] = useState<Dimensions>({
      width: 0,
      height: 0,
    });

    // set the view dimensions on layout
    const onLayout = useCallback(
      ({
        nativeEvent: {
          layout: { width: layoutWidth, height: layoutHeight },
        },
      }: any) => {
        setDimensions({
          width: dimension(layoutWidth),
          height: dimension(layoutHeight),
        });
      },
      []
    );

    // wrap the native onLocationChange and extract the raw event value
    const onLocationChange = useCallback(
      (event: any) => {
        if (wrappedOnLocationChange) {
          wrappedOnLocationChange(event.nativeEvent);
        }
      },
      [wrappedOnLocationChange]
    );

    const onTableOfContents = useCallback(
      (event: any) => {
        if (wrappedOnTableOfContents) {
          const toc = event.nativeEvent.toc || null;
          wrappedOnTableOfContents(toc);
        }
      },
      [wrappedOnTableOfContents]
    );

    // create the view fragment on android
    useEffect(() => {
      if (Platform.OS === 'android' && defaultRef.current) {
        Commands.create(defaultRef.current);
      }
    }, []);

    // assign the forwarded ref
    const hasDefaultRef = defaultRef.current !== null;
    useEffect(() => {
      if (forwardedRef && 'current' in forwardedRef) {
        forwardedRef.current = defaultRef.current;
      } else if (forwardedRef) {
        forwardedRef(defaultRef);
      }
    }, [forwardedRef, hasDefaultRef, defaultRef]);

    const stringifiedPreferences = useMemo(
      () => JSON.stringify(preferences),
      [preferences]
    );

    return (
      <View style={styles.container} onLayout={onLayout}>
        <BaseReadiumView
          height={height}
          width={width}
          {...props}
          hidePageNumbers={hidePageNumbers}
          preferences={stringifiedPreferences}
          onLocationChange={onLocationChange}
          onTableOfContents={onTableOfContents}
          ref={defaultRef}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: { width: '100%', height: '100%' },
});

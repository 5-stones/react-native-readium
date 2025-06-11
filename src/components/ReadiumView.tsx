import React, {
  useCallback,
  useState,
  useEffect,
  forwardRef,
  useRef,
  useMemo,
} from 'react';
import { View, Platform, findNodeHandle, StyleSheet } from 'react-native';

import type {
  BaseReadiumViewProps,
  Dimensions,
  Preferences,
} from '../interfaces';
import { createFragment, getWidthOrHeightValue as dimension } from '../utils';
import { BaseReadiumView } from './BaseReadiumView';

export type ReadiumProps = Omit<BaseReadiumViewProps, 'preferences'> & {
  preferences: Preferences;
};

export const ReadiumView: React.FC<ReadiumProps> = forwardRef(
  (
    {
      onLocationChange: wrappedOnLocationChange,
      onTableOfContents: wrappedOnTableOfContents,
      preferences,
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
          layout: { width, height },
        },
      }: any) => {
        setDimensions({
          width: dimension(width),
          height: dimension(height),
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
        const viewId = findNodeHandle(defaultRef.current);
        createFragment(viewId);
      }
    }, []);

    // assign the forwarded ref
    useEffect(() => {
      if (forwardedRef && 'current' in forwardedRef) {
        forwardedRef.current = defaultRef.current;
      } else if (forwardedRef) {
        forwardedRef(defaultRef);
      }
    }, [defaultRef.current !== null]);

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

import React, {
  useCallback,
  useState,
  useEffect,
  forwardRef,
  useRef,
} from 'react';
import { View, Platform, findNodeHandle, StyleSheet } from 'react-native';

import type { BaseReadiumViewProps, Dimensions } from '../interfaces';
import { Settings } from '../interfaces';
import { createFragment, getWidthOrHeightValue as dimension } from '../utils';
import { BaseReadiumView } from './BaseReadiumView';

export type ReadiumProps = BaseReadiumViewProps;

export const ReadiumView: React.FC<ReadiumProps> = forwardRef(
  (
    {
      onLocationChange: wrappedOnLocationChange,
      onTableOfContents: wrappedOnTableOfContents,
      settings: unmappedSettings,
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

    return (
      <View style={styles.container} onLayout={onLayout}>
        <BaseReadiumView
          height={height}
          width={width}
          {...props}
          onLocationChange={onLocationChange}
          onTableOfContents={onTableOfContents}
          settings={
            unmappedSettings ? Settings.map(unmappedSettings) : undefined
          }
          ref={defaultRef}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: { width: '100%', height: '100%' },
});

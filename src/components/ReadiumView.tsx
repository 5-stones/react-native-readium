import React, { forwardRef, useCallback, useEffect, useState } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  findNodeHandle,
  type LayoutChangeEvent,
} from 'react-native';
import type {
  BaseReadiumViewProps,
  BaseReadiumViewRef,
  Dimensions,
  Link,
  Locator,
} from '../interfaces';
import { Settings } from '../interfaces';
import { createFragment, getWidthOrHeightValue } from '../utils';
import { BaseReadiumView } from './BaseReadiumView';

export type ReadiumProps = Omit<
  BaseReadiumViewProps,
  'onLocationChange' | 'onTableOfContents'
> & {
  onLocationChange?: (locator: Locator) => void;
  onTableOfContents?: (toc: Link[] | null) => void;
};

export const ReadiumView = forwardRef<BaseReadiumViewRef, ReadiumProps>(
  (
    {
      onLocationChange: wrappedOnLocationChange,
      onTableOfContents: wrappedOnTableOfContents,
      settings: unmappedSettings,
      ...props
    },
    ref
  ) => {
    const [dimensions, setDimensions] = useState<Dimensions>({
      width: 0,
      height: 0,
    });
    // Set the view dimensions on layout
    const onLayout = useCallback(
      ({
        nativeEvent: {
          layout: { width, height },
        },
      }: LayoutChangeEvent) => {
        setDimensions({
          width: getWidthOrHeightValue(width),
          height: getWidthOrHeightValue(height),
        });
      },
      []
    );
    // Wrap the native onLocationChange and extract the raw event value
    const onLocationChange = useCallback<
      Required<BaseReadiumViewProps>['onLocationChange']
    >(
      (event) => {
        if (wrappedOnLocationChange) {
          wrappedOnLocationChange(event.nativeEvent);
        }
      },
      [wrappedOnLocationChange]
    );

    const onTableOfContents = useCallback<
      Required<BaseReadiumViewProps>['onTableOfContents']
    >(
      (event) => {
        if (wrappedOnTableOfContents) {
          const toc = event.nativeEvent.toc ?? null;
          wrappedOnTableOfContents(toc);
        }
      },
      [wrappedOnTableOfContents]
    );

    useEffect(() => {
      if (
        Platform.OS === 'android' &&
        ref != null &&
        typeof ref !== 'function'
      ) {
        const viewId = findNodeHandle(ref.current);
        createFragment(viewId);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <View style={styles.container} onLayout={onLayout}>
        <BaseReadiumView
          height={dimensions.height}
          width={dimensions.width}
          {...props}
          ref={ref}
          settings={
            unmappedSettings ? Settings.map(unmappedSettings) : undefined
          }
          onLocationChange={onLocationChange}
          onTableOfContents={onTableOfContents}
        />
      </View>
    );
  }
);

ReadiumView.displayName = 'ReadiumView';

const styles = StyleSheet.create({
  container: { width: '100%', height: '100%' },
});

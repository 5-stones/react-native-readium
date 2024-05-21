import React, { useCallback, useState, useEffect, forwardRef } from 'react';
import { View, Platform, findNodeHandle, StyleSheet } from 'react-native';

import type { BaseReadiumViewProps, Dimensions } from '../interfaces';
import { Settings } from '../interfaces';
import { createFragment, getWidthOrHeightValue as dimension } from '../utils';
import { BaseReadiumView } from './BaseReadiumView';

export type ReadiumProps = BaseReadiumViewProps;

export const ReadiumView: React.FC<ReadiumProps> = forwardRef(({
  onLocationChange: wrappedOnLocationChange,
  onTableOfContents: wrappedOnTableOfContents,
  settings: unmappedSettings,
  ...props
}, ref) => {
  const [{ height, width }, setDimensions] = useState<Dimensions>({
    width: 0,
    height: 0,
  });
  // set the view dimensions on layout
  const onLayout = useCallback(({ nativeEvent: { layout: { width, height } }}: any) => {
    setDimensions({
      width: dimension(width),
      height: dimension(height),
    });
  }, []);
  // wrap the native onLocationChange and extract the raw event value
  const onLocationChange = useCallback((event: any) => {
    if (wrappedOnLocationChange) {
      wrappedOnLocationChange(event.nativeEvent);
    }
  }, [wrappedOnLocationChange]);

  const onTableOfContents = useCallback((event: any) => {
    if (wrappedOnTableOfContents) {
      const toc = event.nativeEvent.toc || null;
      wrappedOnTableOfContents(toc);
    }
  }, [wrappedOnTableOfContents]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      // @ts-ignore 
      const viewId = findNodeHandle(ref.current);
      createFragment(viewId);
    }
  }, [])

  return (
    <View
      style={styles.container}
      onLayout={onLayout}
    >
      <BaseReadiumView
        height={height}
        width={width}
        {...props}
        onLocationChange={onLocationChange}
        onTableOfContents={onTableOfContents}
        settings={unmappedSettings ? Settings.map(unmappedSettings) : undefined}
        ref={ref}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { width: '100%', height: '100%' },
});

import React, { useCallback, useState } from 'react';
import {
  requireNativeComponent,
  UIManager,
  Platform,
  ViewStyle,
  View,
  PixelRatio,
} from 'react-native';

import type { Locator, File, Dimensions } from './interfaces';
import { Settings } from './interfaces';

export * from './enums';
export * from './interfaces';

const LINKING_ERROR =
  `The package 'react-native-readium' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo managed workflow\n';

type ReadiumProps = {
  file: File;
  location?: Locator;
  settings?: Partial<Settings>;
  style?: ViewStyle;
  onLocationChange?: (locator: Locator) => void;
  ref?: any;
  height?: number;
  width?: number;
};

const ComponentName = 'ReadiumView';

const BaseReadiumView =
  UIManager.getViewManagerConfig(ComponentName) != null
    ? requireNativeComponent<ReadiumProps>(ComponentName)
    : () => {
        throw new Error(LINKING_ERROR);
      };

export const ReadiumView: React.FC<ReadiumProps> = ({
  onLocationChange: wrappedOnLocationChange,
  settings: unmappedSettings,
  ...props
}) => {

  const [{ height, width }, setDimensions] = useState<Dimensions>({
    width: 0,
    height: 0,
  });
  const onLocationChange = useCallback((event: any) => {
    if (wrappedOnLocationChange) {
      wrappedOnLocationChange(event.nativeEvent);
    }
  }, [wrappedOnLocationChange]);

  return (
    <View
      style={{ width: '100%', height: '100%' }}
      onLayout={({ nativeEvent: { layout }}) => setDimensions({
        width: PixelRatio.getPixelSizeForLayoutSize(layout.width),
        height: PixelRatio.getPixelSizeForLayoutSize(layout.height),
      })}
    >
      <BaseReadiumView
        height={height}
        width={width}
        {...props}
        onLocationChange={onLocationChange}
        settings={unmappedSettings ? Settings.map(unmappedSettings) : undefined}
      />
    </View>
  );
};

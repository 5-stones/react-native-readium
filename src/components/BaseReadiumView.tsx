import {
  requireNativeComponent,
  UIManager,
  ViewStyle,
} from 'react-native';

import type { Settings, Locator, File, } from '../interfaces';
import { LINKING_ERROR } from '../utils';

export type BaseReadiumViewProps = {
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

export const BaseReadiumView =
  UIManager.getViewManagerConfig(ComponentName) != null
    ? requireNativeComponent<BaseReadiumViewProps>(ComponentName)
    : () => {
        throw new Error(LINKING_ERROR);
      };

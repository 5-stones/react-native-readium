import {
  requireNativeComponent,
  UIManager,
  ViewStyle,
} from 'react-native';

import type { Settings, Locator, File, } from '../interfaces';
import { COMPONENT_NAME, LINKING_ERROR } from '../utils';

export type BaseReadiumViewProps = {
  file: File;
  location?: Locator;
  settings?: Partial<Settings>;
  style?: ViewStyle;
  onLocationChange?: (locator: Locator) => void;
  onTableOfContents?: (toc: Locator[] | null) => void;
  ref?: any;
  height?: number;
  width?: number;
};

export const BaseReadiumView =
  UIManager.getViewManagerConfig(COMPONENT_NAME) != null
    ? requireNativeComponent<BaseReadiumViewProps>(COMPONENT_NAME)
    : () => {
        throw new Error(LINKING_ERROR);
      };

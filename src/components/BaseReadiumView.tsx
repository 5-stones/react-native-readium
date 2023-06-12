import { type RefAttributes } from 'react';
import { requireNativeComponent, UIManager } from 'react-native';
import type { BaseReadiumViewProps, BaseReadiumViewRef } from '../interfaces';
import { componentName, linkingError } from '../utils';

export const BaseReadiumView =
  UIManager.getViewManagerConfig(componentName) != null
    ? requireNativeComponent<
        BaseReadiumViewProps & RefAttributes<BaseReadiumViewRef>
      >(componentName)
    : () => {
        throw new Error(linkingError);
      };

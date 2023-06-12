import { UIManager } from 'react-native';

import { componentName } from './componentName';

export const createFragment = (viewId: number | null) => {
  if (viewId !== null) {
    UIManager.dispatchViewManagerCommand(
      viewId,
      // We are calling the 'create' command
      UIManager.getViewManagerConfig(componentName).Commands.create.toString(),
      [viewId]
    );
  }
};

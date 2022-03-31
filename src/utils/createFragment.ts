import { UIManager } from 'react-native';

import { COMPONENT_NAME } from './COMPONENT_NAME';

export const createFragment = (viewId: number | null) => {
  if (viewId !== null) {
    UIManager.dispatchViewManagerCommand(
      viewId,
      // we are calling the 'create' command
      // @ts-ignore
      UIManager.getViewManagerConfig(COMPONENT_NAME).Commands.create.toString(),
      [viewId],
    );
  }
}

import {
  requireNativeComponent,
  UIManager,
  Platform,
  ViewStyle,
} from 'react-native';

const LINKING_ERROR =
  `The package 'react-native-readium' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo managed workflow\n';

type ReadiumProps = {
  color: string;
  style: ViewStyle;
};

const ComponentName = 'ReadiumView';

export const ReadiumView =
  UIManager.getViewManagerConfig(ComponentName) != null
    ? requireNativeComponent<ReadiumProps>(ComponentName)
    : () => {
        throw new Error(LINKING_ERROR);
      };

import type { HostComponent, ViewProps } from 'react-native';
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
// eslint-disable-next-line @react-native/no-deep-imports
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
// eslint-disable-next-line @react-native/no-deep-imports
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import type { File } from './interfaces/File';
import type { Link } from './interfaces/Link';
import type { Locator } from './interfaces/Locator';

// Event types for native events
type OnLocationChangeEvent = Readonly<Locator>;
type OnTableOfContentsEvent = Readonly<{
  toc: ReadonlyArray<Link> | null;
}>;

// Native component props interface
export interface NativeProps extends ViewProps {
  file: File;
  preferences?: string;
  hidePageNumbers?: boolean;
  onLocationChange?: DirectEventHandler<OnLocationChangeEvent>;
  onTableOfContents?: DirectEventHandler<OnTableOfContentsEvent>;
}

// Native commands interface
export interface NativeCommands {
  create: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
}

// Generate the native component
export const ReadiumViewNativeComponent =
  codegenNativeComponent<NativeProps>('ReadiumView');

// Generate the commands
export const Commands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['create'],
});

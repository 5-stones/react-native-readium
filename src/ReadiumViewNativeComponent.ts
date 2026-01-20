import type { HostComponent, ViewProps } from 'react-native';
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
// eslint-disable-next-line @react-native/no-deep-imports
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
// eslint-disable-next-line @react-native/no-deep-imports
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import type { File } from './interfaces/File';
import type { Locator } from './interfaces/Locator';
import type { PublicationReadyEvent } from './interfaces/PublicationReady';

// Event types for native events
type OnLocationChangeEvent = Readonly<Locator>;
type OnPublicationReadyEvent = Readonly<PublicationReadyEvent>;

// Native component props interface
export interface NativeProps extends ViewProps {
  file: File;
  preferences?: string;
  onLocationChange?: DirectEventHandler<OnLocationChangeEvent>;
  onPublicationReady?: DirectEventHandler<OnPublicationReadyEvent>;
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

import type { HostComponent, ViewProps } from 'react-native';
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
// eslint-disable-next-line @react-native/no-deep-imports
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
// eslint-disable-next-line @react-native/no-deep-imports
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import type { File } from './interfaces/File';
import type { Locator } from './interfaces/Locator';
import type { PublicationReadyEvent } from './interfaces/PublicationReady';
import type { DecorationActivatedEvent } from './interfaces/Decoration';
import type { SelectionEvent } from './interfaces/Selection';
import type { SelectionActionEvent } from './interfaces/SelectionAction';

// Event types for native events
type OnLocationChangeEvent = Readonly<Locator>;
type OnPublicationReadyEvent = Readonly<PublicationReadyEvent>;
type OnDecorationActivatedEvent = Readonly<DecorationActivatedEvent>;
type OnSelectionChangeEvent = Readonly<SelectionEvent>;
type OnSelectionActionEvent = Readonly<SelectionActionEvent>;

// Native component props interface
export interface NativeProps extends ViewProps {
  file: File;
  preferences?: string;
  decorations?: string;
  selectionActions?: string;
  onLocationChange?: DirectEventHandler<OnLocationChangeEvent>;
  onPublicationReady?: DirectEventHandler<OnPublicationReadyEvent>;
  onDecorationActivated?: DirectEventHandler<OnDecorationActivatedEvent>;
  onSelectionChange?: DirectEventHandler<OnSelectionChangeEvent>;
  onSelectionAction?: DirectEventHandler<OnSelectionActionEvent>;
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

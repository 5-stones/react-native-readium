import type { ViewStyle } from 'react-native';
import type { Link } from './Link';
import type { Locator } from './Locator';
import type { File } from './File';
import type { PublicationReadyEvent } from './PublicationReady';

export type BaseReadiumViewProps = {
  file: File;
  location?: Locator | Link;
  preferences?: string; // JSON between native and JS, which we deserialise later
  hidePageNumbers?: boolean; // Show or hide the position label
  style?: ViewStyle;
  onLocationChange?: (locator: Locator) => void;
  onPublicationReady?: (event: PublicationReadyEvent) => void;
  ref?: any;
  height?: number;
  width?: number;
};

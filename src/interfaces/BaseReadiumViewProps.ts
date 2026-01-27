import type { ViewStyle } from 'react-native';
import type { Link } from './Link';
import type { Locator } from './Locator';
import type { File } from './File';
import type { PublicationReadyEvent } from './PublicationReady';
import type { DecorationActivatedEvent } from './Decoration';
import type { SelectionEvent } from './Selection';
import type { SelectionActionEvent } from './SelectionAction';

export type BaseReadiumViewProps = {
  file: File;
  location?: Locator | Link;
  preferences?: string; // JSON between native and JS, which we deserialise later
  decorations?: string; // JSON serialized DecorationGroups
  selectionActions?: string; // JSON serialized SelectionAction[]
  style?: ViewStyle;
  onLocationChange?: (locator: Locator) => void;
  onPublicationReady?: (event: PublicationReadyEvent) => void;
  onDecorationActivated?: (event: DecorationActivatedEvent) => void;
  onSelectionChange?: (event: SelectionEvent) => void;
  onSelectionAction?: (event: SelectionActionEvent) => void;
  ref?: any;
  height?: number;
  width?: number;
};

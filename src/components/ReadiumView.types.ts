import type {
  Preferences,
  Locator,
  File,
  DecorationGroup,
  SelectionAction,
  PublicationReadyEvent,
  DecorationActivatedEvent,
  SelectionEvent,
  SelectionActionEvent,
} from '../interfaces';

export type ReadiumViewRef = {
  goForward: () => void;
  goBackward: () => void;
};

export type ReadiumProps = {
  file: File;
  location?: Locator;
  preferences: Preferences;
  decorations?: DecorationGroup[];
  selectionActions?: SelectionAction[];
  style?: any;
  onLocationChange?: (locator: Locator) => void;
  onPublicationReady?: (event: PublicationReadyEvent) => void;
  onDecorationActivated?: (event: DecorationActivatedEvent) => void;
  onSelectionChange?: (event: SelectionEvent) => void;
  onSelectionAction?: (event: SelectionActionEvent) => void;
};

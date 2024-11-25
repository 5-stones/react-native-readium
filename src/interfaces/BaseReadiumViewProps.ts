import type { ViewStyle } from 'react-native';

import type { Settings } from './Settings';
import type { Link } from './Link';
import type { Locator } from './Locator';
import type { File } from './File';
import type { Positions } from './Positions';

export type BaseReadiumViewProps = {
  file: File;
  location?: Locator | Link;
  settings?: Partial<Settings>;
  style?: ViewStyle;
  onLocationChange?: (locator: Locator) => void;
  onTableOfContents?: (toc: Link[] | null) => void;
  onPositions?: (positions: Positions) => void;
  ref?: any;
  height?: number;
  width?: number;
};

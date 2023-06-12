import { type Component } from 'react';
import type { NativeSyntheticEvent, ViewStyle } from 'react-native';
import type { File } from './File';
import type { Link } from './Link';
import type { Locator } from './Locator';
import type { Settings } from './Settings';

export type BaseReadiumViewProps = {
  file: File;
  location?: Locator | Link;
  settings?: Partial<Settings>;
  style?: ViewStyle;
  onLocationChange?: (locator: NativeSyntheticEvent<Locator>) => void;
  onTableOfContents?: (
    toc: NativeSyntheticEvent<{ toc: Link[] | null }>
  ) => void;
  height?: number;
  width?: number;
};

export type BaseReadiumViewRef = Component<any, any> & {
  nextPage: () => void;
  prevPage: () => void;
};

import RNFS from 'react-native-fs';
import type { Locator } from 'react-native-readium';

export * from './DEFAULT_SETTINGS';
export const epubUrl = `https://test.opds.io/assets/moby/file.epub`;
export const epubPath = `${RNFS.DocumentDirectoryPath}/moby-dick.epub`;
export const initialLocation: Locator = {
  href: '/OPS/main3.xml',
  title: 'Chapter 2 - The Carpet-Bag',
  type: 'application/xhtml+xml',
  target: 27,
  locations: {
    position: 24,
    progression: 0,
    totalProgression: 0.03392330383480826,
  },
};

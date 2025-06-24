import RNFS from 'react-native-fs';
import type { Locator } from 'react-native-readium';

export const EPUB_URL = 'https://test.opds.io/assets/moby/file.epub';
export const EPUB_PATH = `${RNFS.DocumentDirectoryPath}/moby-dick.epub`;
export const INITIAL_LOCATION: Locator = {
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

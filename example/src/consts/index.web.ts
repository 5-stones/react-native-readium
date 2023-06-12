import type { Locator } from 'react-native-readium';

export * from './DEFAULT_SETTINGS';
export const epubUrl = `https://alice.dita.digital/manifest.json`;
export const epubPath = ``;
export const initialLocation: Locator = {
  href: 'text/chapter-6.xhtml',
  locations: {
    progression: 0.4289308176100629,
  },
  type: 'text/html',
  title: 'Chapter 6',
};

import type { Locator } from 'react-native-readium';

export * from './DEFAULT_SETTINGS';
export const EPUB_URL = `http://localhost:3001/pub/aHR0cHM6Ly9vdHQtaXAtc3RhZ2luZy1hc3NldHMuYi1jZG4ubmV0L3B1YmxpYy9hc3NldHMvRkVFLmVwdWI%2FdG9rZW49MllXekJ5S2E0c2Nsa2pINDlDTWdyUSZleHBpcmVzPTE2NzE3NDQwODU%3D/manifest.json`;
export const EPUB_PATH = ``;
export const INITIAL_LOCATION: Locator = {
  href: 'text/chapter-6.xhtml',
  locations: {
    progression: 0.4289308176100629,
  },
  type: 'text/html',
  title: 'Chapter 6'
};

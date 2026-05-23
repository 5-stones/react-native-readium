import { Platform } from 'react-native';

import type { Bookmark } from '../types/reader.types';
import RNFS from './RNFS';

const STORE_VERSION = 1;
const STORAGE_PREFIX = 'react-native-readium:bookmarks:';
const STORAGE_DIR = `${RNFS.DocumentDirectoryPath}/readium/bookmarks`;

interface BookmarkStoreData {
  version: number;
  publicationId: string;
  updatedAt: string;
  bookmarks: Bookmark[];
}

const encodeKey = (publicationId: string) =>
  encodeURIComponent(publicationId).replace(/%/g, '_');

const filePathFor = (publicationId: string) =>
  `${STORAGE_DIR}/${encodeKey(publicationId)}.json`;

const localStorageKeyFor = (publicationId: string) =>
  `${STORAGE_PREFIX}${publicationId}`;

const isBookmark = (value: unknown): value is Bookmark => {
  if (!value || typeof value !== 'object') return false;
  const bookmark = value as Bookmark;
  return (
    typeof bookmark.id === 'string' &&
    typeof bookmark.publicationId === 'string' &&
    typeof bookmark.createdAt === 'string' &&
    !!bookmark.locator &&
    typeof bookmark.locator.href === 'string' &&
    typeof bookmark.locator.type === 'string'
  );
};

const parseStore = (publicationId: string, raw: string): Bookmark[] => {
  const parsed = JSON.parse(raw) as Partial<BookmarkStoreData>;
  if (parsed.publicationId !== publicationId || !Array.isArray(parsed.bookmarks)) {
    return [];
  }
  return parsed.bookmarks.filter(isBookmark);
};

export const loadBookmarks = async (
  publicationId: string
): Promise<Bookmark[]> => {
  if (Platform.OS === 'web') {
    const raw = globalThis.localStorage?.getItem(
      localStorageKeyFor(publicationId)
    );
    return raw ? parseStore(publicationId, raw) : [];
  }

  const path = filePathFor(publicationId);
  if (!(await RNFS.exists(path))) return [];
  return parseStore(publicationId, await RNFS.readFile(path, 'utf8'));
};

export const saveBookmarks = async (
  publicationId: string,
  bookmarks: Bookmark[]
): Promise<void> => {
  const data: BookmarkStoreData = {
    version: STORE_VERSION,
    publicationId,
    updatedAt: new Date().toISOString(),
    bookmarks,
  };
  const raw = JSON.stringify(data, null, 2);

  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(localStorageKeyFor(publicationId), raw);
    return;
  }

  await RNFS.mkdir(STORAGE_DIR);
  const path = filePathFor(publicationId);
  const tempPath = `${path}.tmp`;
  const backupPath = `${path}.bak`;
  await RNFS.writeFile(tempPath, raw, 'utf8');

  if (await RNFS.exists(backupPath)) {
    await RNFS.unlink(backupPath);
  }

  if (await RNFS.exists(path)) {
    await RNFS.moveFile(path, backupPath);
  }

  try {
    await RNFS.moveFile(tempPath, path);
    if (await RNFS.exists(backupPath)) {
      await RNFS.unlink(backupPath);
    }
  } catch (error) {
    if (await RNFS.exists(backupPath)) {
      await RNFS.moveFile(backupPath, path);
    }
    throw error;
  }
};

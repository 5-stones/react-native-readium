import * as FileSystem from 'expo-file-system/legacy';

const stripScheme = (p: string) => (p.startsWith('file://') ? p.slice(7) : p);

const documentDirectory = stripScheme(FileSystem.documentDirectory ?? '');
const cacheDirectory = stripScheme(FileSystem.cacheDirectory ?? '');
const bundleDirectory = stripScheme(FileSystem.bundleDirectory ?? '');

const withScheme = (p: string) => (p.startsWith('file://') ? p : `file://${p}`);

interface DownloadFileOptions {
  fromUrl: string;
  toFile: string;
  background?: boolean;
  discretionary?: boolean;
}

const RNFSAdapter = {
  DocumentDirectoryPath: documentDirectory,
  MainBundlePath: bundleDirectory,
  CachesDirectoryPath: cacheDirectory,
  TemporaryDirectoryPath: cacheDirectory,
  LibraryDirectoryPath: documentDirectory,
  ExternalDirectoryPath: documentDirectory,
  ExternalStorageDirectoryPath: documentDirectory,
  PicturesDirectoryPath: documentDirectory,
  FileProtectionKeys: '',

  exists: async (filepath: string): Promise<boolean> => {
    const info = await FileSystem.getInfoAsync(withScheme(filepath));
    return info.exists;
  },

  unlink: (filepath: string): Promise<void> =>
    FileSystem.deleteAsync(withScheme(filepath), { idempotent: true }),

  copyFile: (from: string, to: string): Promise<void> =>
    FileSystem.copyAsync({ from: withScheme(from), to: withScheme(to) }),

  moveFile: (from: string, to: string): Promise<void> =>
    FileSystem.moveAsync({ from: withScheme(from), to: withScheme(to) }),

  mkdir: (filepath: string): Promise<void> =>
    FileSystem.makeDirectoryAsync(withScheme(filepath), {
      intermediates: true,
    }),

  readFile: (filepath: string, encoding: 'utf8' | 'base64' = 'utf8') =>
    FileSystem.readAsStringAsync(withScheme(filepath), {
      encoding:
        encoding === 'base64'
          ? FileSystem.EncodingType.Base64
          : FileSystem.EncodingType.UTF8,
    }),

  writeFile: (
    filepath: string,
    contents: string,
    encoding: 'utf8' | 'base64' = 'utf8'
  ) =>
    FileSystem.writeAsStringAsync(withScheme(filepath), contents, {
      encoding:
        encoding === 'base64'
          ? FileSystem.EncodingType.Base64
          : FileSystem.EncodingType.UTF8,
    }),

  downloadFile: ({ fromUrl, toFile }: DownloadFileOptions) => {
    const promise = FileSystem.downloadAsync(fromUrl, withScheme(toFile)).then(
      (result) => ({ statusCode: result.status, bytesWritten: 0 })
    );
    return { promise };
  },
};

export const RNFS = RNFSAdapter;
export default RNFSAdapter;

// react-native-fs is not supported on web
// This is a stub to prevent import errors
const RNFSStub = {
  DocumentDirectoryPath: '',
  MainBundlePath: '',
  CachesDirectoryPath: '',
  ExternalDirectoryPath: '',
  ExternalStorageDirectoryPath: '',
  TemporaryDirectoryPath: '',
  LibraryDirectoryPath: '',
  PicturesDirectoryPath: '',
  FileProtectionKeys: '',
  exists: () => Promise.reject(new Error('RNFS is not supported on web')),
  readFile: () => Promise.reject(new Error('RNFS is not supported on web')),
  writeFile: () => Promise.reject(new Error('RNFS is not supported on web')),
  mkdir: () => Promise.reject(new Error('RNFS is not supported on web')),
  unlink: () => Promise.reject(new Error('RNFS is not supported on web')),
  readDir: () => Promise.reject(new Error('RNFS is not supported on web')),
  stat: () => Promise.reject(new Error('RNFS is not supported on web')),
  copyFile: () => Promise.reject(new Error('RNFS is not supported on web')),
  moveFile: () => Promise.reject(new Error('RNFS is not supported on web')),
  downloadFile: () => ({
    promise: Promise.reject(new Error('RNFS is not supported on web')),
  }),
};

export const RNFS = RNFSStub;
export default RNFSStub;

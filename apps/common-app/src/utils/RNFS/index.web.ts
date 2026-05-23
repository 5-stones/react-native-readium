// expo-file-system is not supported on web; this stub matches the native adapter shape.
const reject = () => Promise.reject(new Error('RNFS is not supported on web'));

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
  exists: reject,
  readFile: reject,
  writeFile: reject,
  mkdir: reject,
  unlink: reject,
  copyFile: reject,
  moveFile: reject,
  downloadFile: () => ({ promise: reject() }),
};

export const RNFS = RNFSStub;
export default RNFSStub;

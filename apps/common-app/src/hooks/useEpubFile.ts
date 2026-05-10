import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import type { File, Locator } from 'react-native-readium';
import RNFS from '../utils/RNFS';

interface UseEpubFileOptions {
  url?: string;
  path?: string;
  bundledAsset?: string;
  initialLocation?: Locator;
}

async function copyBundledAsset(
  assetName: string,
  destPath: string
): Promise<void> {
  if (Platform.OS === 'android') {
    await RNFS.copyFileAssets(assetName, destPath);
  } else {
    const sourcePath = `${RNFS.MainBundlePath}/${assetName}`;
    await RNFS.copyFile(sourcePath, destPath);
  }
}

export const useEpubFile = ({
  url,
  path,
  bundledAsset,
  initialLocation,
}: UseEpubFileOptions) => {
  const [file, setFile] = useState<File>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFile() {
      try {
        setIsLoading(true);
        setError(null);

        let fileUrl = url || '';

        if (path) {
          const localPath = path;
          const exists = await RNFS.exists(localPath);

          if (!exists) {
            if (bundledAsset) {
              console.log(
                `Copying bundled asset: '${bundledAsset}' to '${localPath}'`
              );
              await copyBundledAsset(bundledAsset, localPath);
            } else if (url) {
              console.log(`Downloading file: '${url}'`);
              const { promise } = RNFS.downloadFile({
                fromUrl: url,
                toFile: localPath,
                background: true,
                discretionary: true,
              });
              await promise;
            } else {
              throw new Error(
                'No source available: url or bundledAsset is required'
              );
            }
          } else {
            console.log('File already exists. Skipping.', localPath);
          }

          fileUrl = localPath;
        }

        if (!cancelled) {
          setFile({
            url: fileUrl,
            initialLocation,
          });
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err : new Error('Failed to load file')
          );
          setIsLoading(false);
        }
      }
    }

    loadFile();

    return () => {
      cancelled = true;
    };
  }, [url, path, bundledAsset, initialLocation]);

  return { file, isLoading, error };
};

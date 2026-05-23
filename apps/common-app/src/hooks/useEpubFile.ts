import { useState, useEffect } from 'react';
import { Asset } from 'expo-asset';
import type { File, Locator } from 'react-native-readium';
import RNFS from '../utils/RNFS';

interface UseEpubFileOptions {
  epubUrl?: string;
  epubPath?: string;
  bundledAsset?: number;
  initialLocation?: Locator;
}

async function copyBundledAsset(
  assetModule: number,
  destPath: string
): Promise<void> {
  const asset = Asset.fromModule(assetModule);
  await asset.downloadAsync();
  if (!asset.localUri) {
    throw new Error('Failed to resolve bundled epub asset');
  }
  await RNFS.copyFile(asset.localUri, destPath);
}

export const useEpubFile = ({
  epubUrl,
  epubPath,
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

        let url = epubUrl || '';

        if (epubPath) {
          const localPath = epubPath;
          const exists = await RNFS.exists(localPath);

          if (!exists) {
            if (bundledAsset) {
              console.log(`Copying bundled asset to '${localPath}'`);
              await copyBundledAsset(bundledAsset, localPath);
            } else if (epubUrl) {
              console.log(`Downloading file: '${epubUrl}'`);
              const { promise } = RNFS.downloadFile({
                fromUrl: epubUrl,
                toFile: localPath,
                background: true,
                discretionary: true,
              });
              await promise;
            } else {
              throw new Error(
                'No source available: epubUrl or bundledAsset is required'
              );
            }
          } else {
            console.log('File already exists. Skipping.', localPath);
          }

          url = localPath;
        }

        if (!cancelled) {
          setFile({
            url,
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
  }, [epubUrl, epubPath, bundledAsset, initialLocation]);

  return { file, isLoading, error };
};

import { useState, useEffect } from 'react';
import type { File, Locator } from 'react-native-readium';
import RNFS from '../utils/RNFS';

interface UseEpubFileOptions {
  epubUrl: string;
  epubPath?: string;
  initialLocation?: Locator;
}

export const useEpubFile = ({
  epubUrl,
  epubPath,
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

        let url = epubUrl;

        if (epubPath) {
          // For native platforms, use epubPath if provided, otherwise generate from epubUrl
          const localPath =
            epubPath ||
            `${RNFS.DocumentDirectoryPath}/${epubUrl.split('/').pop()}`;

          const exists = await RNFS.exists(localPath);

          if (!exists) {
            console.log(`Downloading file: '${epubUrl}'`);
            const { promise } = RNFS.downloadFile({
              fromUrl: epubUrl,
              toFile: localPath,
              background: true,
              discretionary: true,
            });

            await promise;
          } else {
            console.log('File already exists. Skipping download.');
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
  }, [epubUrl, epubPath, initialLocation]);

  return { file, isLoading, error };
};

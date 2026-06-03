import { useState, useEffect } from 'react';
import type { File, Locator } from 'react-native-readium';

interface UsePdfFileOptions {
  url?: string;
  initialLocation?: Locator;
}

export const usePdfFile = ({
  url,
  initialLocation,
}: UsePdfFileOptions) => {
  const [file, setFile] = useState<File>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFile() {
      try {
        setIsLoading(true);
        setError(null);

        if(!url) {
          setIsLoading(false);
          return;
        }

        if (!cancelled) {
          setFile({
            url: url || '',
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
  }, [url, initialLocation]);

  return { file, isLoading, error };
};

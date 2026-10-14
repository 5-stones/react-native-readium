import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { File, Locator } from 'react-native-readium';
import RNFS from '../utils/RNFS';
import { classify, localPathFor } from '../utils/bookStorage';

interface UseBookOptions {
  /** See {@link BookOption.asset}. */
  asset?: string;
  initialLocation?: Locator;
}

async function copyBundledAsset(
  assetName: string,
  destPath: string
): Promise<void> {
  if (Platform.OS === 'android') {
    await RNFS.copyFileAssets(assetName, destPath);
  } else {
    await RNFS.copyFile(`${RNFS.MainBundlePath}/${assetName}`, destPath);
  }
}

/**
 * Makes [asset] available to the reader, and returns the url to open.
 *
 * A remote publication is opened where it is. Downloading one is a separate,
 * deliberate act — downloading everything is also how you never find out
 * whether reading remotely works. A bundled one has to be copied out first;
 * there is no reading it in place.
 */
export async function resolveAsset(asset: string): Promise<string> {
  // Web has no filesystem - RNFS is a stub there - so reading the asset where
  // it already lives is the only option.
  if (Platform.OS === 'web') {
    return asset;
  }

  const kind = classify(asset);
  if (kind === 'path' || kind === 'remote') {
    return asset;
  }

  const localPath = localPathFor(asset)!;
  if (await RNFS.exists(localPath)) return localPath;

  await copyBundledAsset(asset, localPath);
  return localPath;
}

/**
 * Resolves a book's [asset] into a file the reader can open, and lets a remote
 * one be stored for offline reading.
 *
 * The publication's format is deliberately not part of this: Readium sniffs it
 * natively, and the web view picks its navigator from the URL, so neither the
 * caller nor this hook needs to know whether it is an EPUB or a PDF.
 */
export const useBook = ({ asset, initialLocation }: UseBookOptions) => {
  const [file, setFile] = useState<File>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  /** Whether a stored copy is what is being read, rather than the remote url. */
  const [isDownloaded, setIsDownloaded] = useState(false);

  useEffect(() => {
    if (!asset) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const local = localPathFor(asset);
        // A copy already on disk is what to read, whatever the asset says.
        const stored =
          !!local && classify(asset) === 'remote' && (await RNFS.exists(local));
        const url = stored ? local! : await resolveAsset(asset);

        if (!cancelled) {
          setIsDownloaded(stored);
          setFile({ url, initialLocation });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err : new Error('Failed to load file')
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [asset, initialLocation]);

  return { file, isLoading, error, isDownloaded };
};

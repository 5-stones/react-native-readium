import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import type { File, Locator } from 'react-native-readium';
import RNFS from '../utils/RNFS';

interface UseBookOptions {
  /** See {@link BookOption.asset}. */
  asset?: string;
  initialLocation?: Locator;
}

type SourceKind = 'remote' | 'path' | 'bundled';

/**
 * Classifies an asset by its shape, so callers describe *where* a
 * publication is rather than *how* to fetch it.
 */
function classify(asset: string): SourceKind {
  if (/^https?:\/\//i.test(asset)) return 'remote';
  if (asset.startsWith('file://') || asset.startsWith('/')) return 'path';
  return 'bundled';
}

/** Filename to cache a remote publication under, derived from its URL. */
function cacheNameFor(asset: string): string {
  const withoutQuery = asset.split('?')[0].split('#')[0];
  const name = withoutQuery.substring(withoutQuery.lastIndexOf('/') + 1);
  // Fall back to something stable if the URL ends in a slash.
  return name || 'publication';
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
 * Remote publications are downloaded and bundled ones copied out, both into the
 * documents directory, so that later opens are local and work offline. Anything
 * already there is reused.
 */
async function resolveAsset(asset: string): Promise<string> {
  // Web has no filesystem - RNFS is a stub there - so reading the asset where
  // it already lives is the only option.
  if (Platform.OS === 'web') {
    return asset;
  }

  const kind = classify(asset);
  if (kind === 'path') {
    return asset;
  }

  const name = kind === 'bundled' ? asset : cacheNameFor(asset);
  const localPath = `${RNFS.DocumentDirectoryPath}/${name}`;

  if (await RNFS.exists(localPath)) {
    console.log('File already exists. Skipping.', localPath);
    return localPath;
  }

  if (kind === 'bundled') {
    console.log(`Copying bundled asset '${asset}' to '${localPath}'`);
    await copyBundledAsset(asset, localPath);
    return localPath;
  }

  console.log(`Downloading '${asset}' to '${localPath}'`);
  const { promise } = RNFS.downloadFile({
    fromUrl: asset,
    toFile: localPath,
    background: true,
    discretionary: true,
  });
  await promise;
  return localPath;
}

/**
 * Resolves a book's [asset] into a file the reader can open.
 *
 * The publication's format is deliberately not part of this: Readium sniffs it
 * natively, and the web view picks its navigator from the URL, so neither the
 * caller nor this hook needs to know whether it is an EPUB or a PDF.
 */
export const useBook = ({ asset, initialLocation }: UseBookOptions) => {
  const [file, setFile] = useState<File>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
        const url = await resolveAsset(asset);
        if (!cancelled) {
          setFile({ url, initialLocation });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load file'));
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

  return { file, isLoading, error };
};

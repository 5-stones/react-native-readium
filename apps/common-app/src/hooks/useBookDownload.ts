import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import RNFS from '../utils/RNFS';
import { localPathFor, isRemote } from '../utils/bookStorage';
import { resolveSource } from '../utils/resolveSource';

/**
 * Stores a remote publication for offline reading, and deletes it again.
 *
 * Separate from {@link useBook} because downloading belongs to the library
 * list rather than to reading: a publication is stored before it is opened,
 * and whether a copy exists decides what opening it will read.
 */
export const useBookDownload = (asset?: string) => {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /** Only a remote publication has anywhere else to be. */
  const canDownload = !!asset && Platform.OS !== 'web' && isRemote(asset);

  useEffect(() => {
    if (!canDownload || !asset) return;

    let cancelled = false;
    const localPath = localPathFor(asset);
    if (!localPath) return;

    RNFS.exists(localPath)
      .then((exists) => {
        if (!cancelled) setIsDownloaded(exists);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [asset, canDownload]);

  const download = useCallback(async () => {
    if (!asset || !canDownload || isDownloading) return;
    const localPath = localPathFor(asset);
    if (!localPath) return;

    setIsDownloading(true);
    setError(null);
    try {
      if (!(await RNFS.exists(localPath))) {
        // The same exchange the reader makes: an url that names a
        // publication is not one its bytes can be fetched from. A guarded
        // endpoint answers 401 without a credential, and `RNFS` sends none.
        const { url } = await resolveSource({ url: asset, reason: 'open' });

        const { promise } = RNFS.downloadFile({
          fromUrl: url,
          toFile: localPath,
          background: true,
          discretionary: true,
        });
        const { statusCode } = await promise;
        if (statusCode && statusCode >= 400) {
          // A refused download still leaves a file behind, which would
          // otherwise be opened as though it were a publication.
          await RNFS.unlink(localPath).catch(() => {});
          throw new Error(`Download failed (${statusCode})`);
        }
      }
      setIsDownloaded(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Download failed'));
    } finally {
      setIsDownloading(false);
    }
  }, [asset, canDownload, isDownloading]);

  const remove = useCallback(async () => {
    if (!asset) return;
    const localPath = localPathFor(asset);
    if (!localPath) return;

    setError(null);
    try {
      await RNFS.unlink(localPath).catch(() => {});
      setIsDownloaded(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Delete failed'));
    }
  }, [asset]);

  return { isDownloaded, isDownloading, canDownload, error, download, remove };
};

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import RNFS from 'react-native-fs';
import { LCP, LcpError } from 'react-native-readium-lcp';
import type { LcpAuthRequest } from 'react-native-readium-lcp';
import type { BookOption } from 'common-app';

export type LcpStatus = 'initializing' | 'ready' | 'unavailable' | 'failed';

/** Books acquired from an LCPL, kept across launches. */
const libraryPath = `${RNFS.DocumentDirectoryPath}/lcp-library.json`;

async function loadLibrary(): Promise<BookOption[]> {
  if (!(await RNFS.exists(libraryPath))) return [];
  return JSON.parse(await RNFS.readFile(libraryPath, 'utf8'));
}

async function saveLibrary(books: BookOption[]): Promise<void> {
  await RNFS.writeFile(libraryPath, JSON.stringify(books), 'utf8');
}

/**
 * Starts react-native-readium-lcp, answers passphrase requests through `prompt`, and
 * keeps the list of acquired books.
 */
export function useLcp() {
  const [status, setStatus] = useState<LcpStatus>('initializing');
  const [error, setError] = useState<string>();
  const [books, setBooks] = useState<BookOption[]>([]);
  const [progress, setProgress] = useState<number>();
  const [prompt, setPrompt] = useState<LcpAuthRequest | null>(null);
  const answer = useRef<((passphrase: string | null) => void) | undefined>(
    undefined
  );

  useEffect(() => {
    LCP.setAuthenticationHandler(
      (request) =>
        new Promise((resolve) => {
          // Readium waits on every request, so one must never go unanswered: a newer request
          // replaces the prompt, and the one it replaces gives up.
          answer.current?.(null);
          answer.current = resolve;
          setPrompt(request);
        })
    );

    LCP.initialize()
      .then((available) => setStatus(available ? 'ready' : 'unavailable'))
      .catch((e) => {
        setStatus('failed');
        setError(e.message);
      });

    loadLibrary().then(setBooks).catch(console.warn);

    return () => {
      LCP.setAuthenticationHandler(null);
      answer.current?.(null);
    };
  }, []);

  const respond = useCallback((passphrase: string | null) => {
    answer.current?.(passphrase);
    answer.current = undefined;
    setPrompt(null);
  }, []);

  /** `lcpl` is an LCPL URL, or an absolute path to one on the device. */
  const acquire = useCallback(async (lcpl: string) => {
    setError(undefined);
    setProgress(0);
    try {
      const acquired = await LCP.acquirePublication(
        lcpl.startsWith('/') ? { path: lcpl } : { url: lcpl },
        { onProgress: setProgress }
      );
      // The library picks a temporary location; keep the book where the app can find it.
      const path = `${RNFS.DocumentDirectoryPath}/${acquired.suggestedFilename}`;
      if (await RNFS.exists(path)) await RNFS.unlink(path);
      await RNFS.moveFile(acquired.localPath, path);

      const book: BookOption = {
        id: `lcp-${acquired.licenseId}`,
        title: acquired.suggestedFilename,
        author: 'Readium LCP',
        asset: path,
        protection: 'lcp',
      };
      setBooks((current) => {
        const next = [...current.filter((b) => b.id !== book.id), book];
        saveLibrary(next).catch(console.warn);
        return next;
      });
    } catch (e: any) {
      // Every LCP call rejects with an LcpError, whose message is a sentence for users (and
      // whose `code` is for branching). Moving the file can fail too, with a plain Error.
      Alert.alert(
        "Couldn't add this book",
        e instanceof LcpError
          ? e.message
          : "The downloaded book couldn't be saved."
      );
    } finally {
      setProgress(undefined);
    }
  }, []);

  const [notice, setNotice] = useState<string>();

  const forgetPassphrases = useCallback(async () => {
    setNotice(undefined);
    try {
      await LCP.forgetPassphrases();
      setNotice('Passphrases forgotten: every book will ask again.');
    } catch (e: any) {
      setNotice(e.message);
    }
  }, []);

  const remove = useCallback(async (book: BookOption) => {
    if (await RNFS.exists(book.asset)) await RNFS.unlink(book.asset);
    setBooks((current) => {
      const next = current.filter((b) => b.id !== book.id);
      saveLibrary(next).catch(console.warn);
      return next;
    });
  }, []);

  return {
    status,
    error,
    books,
    progress,
    acquire,
    remove,
    notice,
    forgetPassphrases,
    prompt,
    submitPassphrase: (passphrase: string) => respond(passphrase),
    cancelPassphrase: () => respond(null),
  };
}

import React, { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LCP, describeLcpError } from 'react-native-readium-lcp';
import type { LcpLicense } from 'react-native-readium-lcp';
import { resolveAsset } from 'common-app';
import type { BookOption } from 'common-app';

interface LicenseModalProps {
  book: BookOption | null;
  onClose: () => void;
  onRemove: (book: BookOption) => void;
}

const formatDate = (date?: Date) => (date ? date.toLocaleString() : '—');
const formatLimit = (left?: number) =>
  left === undefined ? 'Unlimited' : `${left} left`;

/** Shows an acquired book's license and lets the user renew or return the loan. */
export const LicenseModal: React.FC<LicenseModalProps> = ({
  book,
  onClose,
  onRemove,
}) => {
  const [license, setLicense] = useState<LcpLicense>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const run = useCallback(async (action: () => Promise<LcpLicense | void>) => {
    setBusy(true);
    setError(undefined);
    try {
      const result = await action();
      if (result) setLicense(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, []);

  const [path, setPath] = useState<string>();

  useEffect(() => {
    setLicense(undefined);
    setPath(undefined);
    if (!book) return;
    run(async () => {
      const local = await resolveAsset(book.asset);
      setPath(local);
      return LCP.getLicense(local);
    });
  }, [book, run]);

  // Not being a Modal, it handles Android's back button itself.
  useEffect(() => {
    if (!book) return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onClose();
        return true;
      }
    );
    return () => subscription.remove();
  }, [book, onClose]);

  if (!book) return null;

  const rows: [string, string][] = license
    ? [
        ['Provider', license.provider],
        ['Status', license.status ?? 'unknown'],
        ['Issued', formatDate(license.issued)],
        ['Loan start', formatDate(license.start)],
        ['Loan end', formatDate(license.end)],
        ['Copy', formatLimit(license.charactersToCopyLeft)],
        ['Print', formatLimit(license.pagesToPrintLeft)],
      ]
    : [];

  return (
    // An overlay, not a Modal: getLicense may ask for the passphrase, and iOS can't present the
    // passphrase prompt's Modal on top of another Modal.
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      <View style={styles.card}>
        <Text style={styles.title}>{book.title}</Text>

        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text testID={`lcp-license-${label}`} style={styles.value}>
              {value}
            </Text>
          </View>
        ))}

        {license?.restriction ? (
          <Text testID="lcp-license-restriction" style={styles.error}>
            {describeLcpError(license.restriction)}
          </Text>
        ) : null}
        {busy ? <ActivityIndicator style={styles.spinner} /> : null}
        {error ? (
          <Text testID="lcp-license-error" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <View style={styles.actions}>
          {license?.canRenewLoan ? (
            <TouchableOpacity
              onPress={() => path && run(() => LCP.renewLoan(path))}
              disabled={busy || !path}
            >
              <Text style={styles.action}>Renew loan</Text>
            </TouchableOpacity>
          ) : null}
          {license?.canReturnPublication ? (
            <TouchableOpacity
              onPress={() =>
                path &&
                run(async () => {
                  await LCP.returnPublication(path);
                  return LCP.getLicense(path);
                })
              }
              disabled={busy || !path}
            >
              <Text style={styles.action}>Return</Text>
            </TouchableOpacity>
          ) : null}
          {book.asset.startsWith('/') ? (
            <TouchableOpacity
              onPress={() => {
                onRemove(book);
                onClose();
              }}
            >
              <Text style={styles.remove}>Remove</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity testID="lcp-license-close" onPress={onClose}>
            <Text style={styles.action}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#333' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: { color: '#666' },
  value: { color: '#333', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  spinner: { marginTop: 12 },
  error: { color: '#C62828', marginTop: 12 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 20,
  },
  action: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  remove: { color: '#C62828', fontSize: 16 },
});

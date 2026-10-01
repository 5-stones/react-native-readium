import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LCP } from 'react-native-readium-lcp';
import type { BookOption } from 'common-app';
import type { LcpStatus } from './useLcp';
import { LcpHelp } from './LcpHelp';

/** Which LCP client native code gave react-native-readium-lcp, from the app's initial props. */
export type LcpClientKind = 'liblcp' | 'basic-profile' | 'none';

const clientText: Record<LcpClientKind, string> = {
  'liblcp': "EDRLab's liblcp",
  'basic-profile': 'Basic-profile test client (debug only, test licenses only)',
  'none': 'None',
};

interface LcpPanelProps {
  status: LcpStatus;
  client: LcpClientKind;
  error?: string;
  books: BookOption[];
  progress?: number;
  notice?: string;
  onAcquire: (lcpl: string) => void;
  onForgetPassphrases: () => void;
  onShowLicense: (book: BookOption) => void;
}

const statusText: Record<LcpStatus, string> = {
  initializing: 'Starting…',
  ready: 'Ready',
  unavailable:
    'Unavailable: this build has no liblcp. See the README to build with READIUM_LCP_PODSPEC / READIUM_LCP_AAR.',
  failed: 'Failed to start',
};

/** Imports LCP-protected books from an LCPL and lists their licenses. */
export const LcpPanel: React.FC<LcpPanelProps> = ({
  status,
  client,
  error,
  books,
  progress,
  notice,
  onAcquire,
  onForgetPassphrases,
  onShowLicense,
}) => {
  const [lcpl, setLcpl] = useState('');
  const [helpVisible, setHelpVisible] = useState(false);
  const busy = progress !== undefined;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Readium LCP</Text>
      <Text testID="lcp-status" style={styles.status}>
        {statusText[status]}
      </Text>
      <Text testID="lcp-client" style={styles.status}>
        Client: {clientText[client]}
      </Text>

      {status === 'ready' ? (
        <>
          <View style={styles.inputRow}>
            <TextInput
              testID="lcp-lcpl-input"
              style={[styles.input, styles.inputGrow]}
              value={lcpl}
              onChangeText={setLcpl}
              placeholder="LCPL URL or path"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              testID="lcp-help"
              style={styles.helpButton}
              onPress={() => setHelpVisible(true)}
              accessibilityLabel="How to get a test book"
            >
              <Text style={styles.helpText}>ⓘ</Text>
            </TouchableOpacity>
          </View>
          <LcpHelp
            visible={helpVisible}
            onClose={() => setHelpVisible(false)}
            onAcquire={(url) => {
              setLcpl(url);
              onAcquire(url);
            }}
          />
          <TouchableOpacity
            testID="lcp-acquire"
            style={[styles.button, (busy || !lcpl) && styles.disabled]}
            disabled={busy || !lcpl}
            onPress={() => onAcquire(lcpl.trim())}
          >
            <Text style={styles.buttonText}>
              {busy
                ? `Downloading… ${Math.round((progress ?? 0) * 100)}%`
                : 'Acquire publication'}
            </Text>
          </TouchableOpacity>
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Hidden where the platform can't forget passphrases (Android, for now). */}
      {status === 'ready' && LCP.capabilities.forgetPassphrases ? (
        <TouchableOpacity
          testID="lcp-forget-passphrases"
          style={styles.secondaryButton}
          onPress={onForgetPassphrases}
        >
          <Text style={styles.secondaryButtonText}>Forget passphrases</Text>
        </TouchableOpacity>
      ) : null}
      {notice ? (
        <Text testID="lcp-notice" style={styles.status}>
          {notice}
        </Text>
      ) : null}

      {books.map((book) => (
        <TouchableOpacity
          key={book.id}
          testID={`lcp-license-${book.id}`}
          style={styles.licenseRow}
          onPress={() => onShowLicense(book)}
        >
          <Text style={styles.licenseTitle} numberOfLines={1}>
            {book.title}
          </Text>
          <Text style={styles.licenseLink}>License</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  heading: { fontSize: 18, fontWeight: '600', color: '#333' },
  status: { color: '#666', marginTop: 4, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 10,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  disabled: { opacity: 0.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputGrow: { flex: 1 },
  helpButton: { paddingHorizontal: 10, paddingVertical: 6 },
  helpText: { color: '#007AFF', fontSize: 22 },
  secondaryButton: { alignItems: 'center', padding: 10, marginTop: 4 },
  secondaryButtonText: { color: '#007AFF' },
  buttonText: { color: '#FFF', fontWeight: '600' },
  error: { color: '#C62828', marginTop: 8 },
  licenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDD',
    marginTop: 8,
  },
  licenseTitle: { flex: 1, color: '#333' },
  licenseLink: { color: '#007AFF', marginLeft: 12 },
});

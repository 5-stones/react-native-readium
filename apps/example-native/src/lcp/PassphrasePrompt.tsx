import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { LcpAuthRequest } from 'react-native-readium-lcp';

interface PassphrasePromptProps {
  request: LcpAuthRequest | null;
  onSubmit: (passphrase: string) => void;
  onCancel: () => void;
}

/** The app's own passphrase UI, shown whenever a license asks for its passphrase. */
export const PassphrasePrompt: React.FC<PassphrasePromptProps> = ({
  request,
  onSubmit,
  onCancel,
}) => {
  const [passphrase, setPassphrase] = useState('');

  useEffect(() => setPassphrase(''), [request]);

  return (
    <Modal
      visible={!!request}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Passphrase required</Text>
          {request?.reason === 'invalidPassphrase' ? (
            <Text style={styles.error}>That passphrase was incorrect.</Text>
          ) : null}
          <Text style={styles.label}>{request?.provider}</Text>
          <Text style={styles.hint}>Hint: {request?.hint}</Text>
          <TextInput
            testID="lcp-passphrase-input"
            style={styles.input}
            value={passphrase}
            onChangeText={setPassphrase}
            placeholder="Passphrase"
            secureTextEntry
            autoFocus
            autoCapitalize="none"
            onSubmitEditing={() => onSubmit(passphrase)}
          />
          <View style={styles.actions}>
            <TouchableOpacity onPress={onCancel} style={styles.button}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="lcp-passphrase-submit"
              onPress={() => onSubmit(passphrase)}
              style={styles.button}
            >
              <Text style={styles.submit}>Unlock</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#333' },
  error: { color: '#C62828', marginBottom: 8 },
  label: { color: '#666', marginBottom: 4 },
  hint: { color: '#333', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 10,
    color: '#333',
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  button: { paddingHorizontal: 12, paddingVertical: 8 },
  cancel: { color: '#666', fontSize: 16 },
  submit: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
});

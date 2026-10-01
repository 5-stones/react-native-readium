import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';

const FRONT_TEST = 'https://front-test.edrlab.org';
const licenseUrl = (purchase: string) =>
  `${FRONT_TEST}/frontend/api/v1/purchases/${purchase}/license`;

interface LcpHelpProps {
  visible: boolean;
  onClose: () => void;
  /** Acquires the publication behind a license URL. */
  onAcquire: (url: string) => void;
}

const Link: React.FC<{ url: string; children: React.ReactNode }> = ({
  url,
  children,
}) => (
  <Text style={styles.link} onPress={() => Linking.openURL(url)}>
    {children}
  </Text>
);

const steps: React.ReactNode[] = [
  <Link url={FRONT_TEST}>Open front-test</Link>,
  <>Navigate to "Users" and add your own (remember your password for later).</>,
  <>
    Navigate to "Purchases" and add a purchase for your user (no financial
    information is required, this is all test data).
  </>,
  <>
    Find your purchase's number: it's the "id" shown for your purchase on
    front-test.
  </>,
  <>Enter it below and tap "Acquire" to download the book.</>,
  <>Open the book from this tab and enter your password from step 2.</>,
];

/**
 * How to get a test book from front-test.edrlab.org, EDRLab's test deployment of the Readium
 * LCP Server. Its licenses use LCP's basic profile, which debug builds open without liblcp.
 */
export const LcpHelp: React.FC<LcpHelpProps> = ({
  visible,
  onClose,
  onAcquire,
}) => {
  const [purchase, setPurchase] = useState('');
  const number = purchase.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ScrollView>
            <Text style={styles.title}>Getting a test book</Text>
            <Text style={styles.body}>
              front-test is EDRLab's test bookstore. It issues real LCP
              licenses, which debug builds of this app open without EDRLab's
              library.
            </Text>

            {steps.map((step, index) => (
              <Text key={index} style={styles.step}>
                {index + 1}. {step}
              </Text>
            ))}

            <Text style={styles.label}>Purchase number</Text>
            <TextInput
              testID="lcp-help-purchase"
              style={styles.input}
              value={purchase}
              onChangeText={setPurchase}
              placeholder="e.g. 9"
              keyboardType="number-pad"
            />
            {number ? (
              <Text selectable style={styles.url}>
                {licenseUrl(number)}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.cancel}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="lcp-help-acquire"
                disabled={!number}
                onPress={() => {
                  onAcquire(licenseUrl(number));
                  onClose();
                }}
              >
                <Text style={[styles.action, !number && styles.disabled]}>
                  Acquire
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    maxHeight: '85%',
  },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#333' },
  body: { color: '#333', marginBottom: 12 },
  step: { color: '#333', marginBottom: 6 },
  link: { color: '#007AFF' },
  label: { color: '#666', marginTop: 16, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 10,
    color: '#333',
  },
  url: { color: '#666', fontSize: 12, marginTop: 6 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
    marginTop: 20,
  },
  cancel: { color: '#666', fontSize: 16 },
  action: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.4 },
});

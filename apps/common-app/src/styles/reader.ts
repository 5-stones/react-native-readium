import { StyleSheet, Platform, DimensionValue } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: (Platform.OS === 'web' ? '100vh' : '100%') as DimensionValue,
  },
  reader: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
  },
  readiumContainer: {
    flex: 1,
    width: Platform.OS === 'web' ? '80%' : '100%',
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorDetail: {
    marginTop: 12,
    paddingHorizontal: 24,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    opacity: 0.8,
  },
  // A read failure leaves the reader intact, so it gets a banner rather than
  // the screen.
  readFailureBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
  },
  readFailureText: {
    color: '#fff',
    flexShrink: 1,
    fontSize: 13,
  },
  readFailureRetry: {
    color: '#9cd0ff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 16,
  },
});

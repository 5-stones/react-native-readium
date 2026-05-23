import { StyleSheet, Platform, DimensionValue } from 'react-native';
import { palette } from './theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: (Platform.OS === 'web' ? '100vh' : '100%') as DimensionValue,
    backgroundColor: palette.surface,
  },
  reader: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
  },
  readiumContainer: {
    flex: 1,
    width: Platform.OS === 'web' ? '80%' : '100%',
    backgroundColor: palette.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.bg,
  },
});

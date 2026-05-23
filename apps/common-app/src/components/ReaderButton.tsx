import React from 'react';
import {
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { palette } from '../styles/theme';

export interface ReaderButtonProps {
  name: string;
  onPress: () => void;
  style?: ViewStyle;
  size?: number;
  color?: string;
}

export const ReaderButton: React.FC<ReaderButtonProps> = ({
  name,
  onPress,
  size = 60,
  style = {},
  color,
}) => {
  const iconColor =
    color ?? (Platform.OS === 'web' ? palette.textSecondary : palette.textPrimary);

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        onPress={onPress}
        style={styles.button}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={`${name} button`}
      >
        <MaterialIcons name={name} size={size} color={iconColor} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

import React from 'react';
import {
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export interface ReaderButtonProps {
  name: string;
  onPress: () => void;
  style?: ViewStyle;
}

export const ReaderButton: React.FC<ReaderButtonProps> = ({
  name,
  onPress,
  style = {},
}) => {
  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        onPress={onPress}
        style={styles.button}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${name} button`}
      >
        <MaterialIcons
          name={name}
          size={60}
          color={Platform.OS === 'web' ? '#666' : undefined}
        />
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

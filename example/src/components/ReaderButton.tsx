import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Button, Icon } from '@rneui/themed';

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
    <Button
      icon={<Icon name={name} size={60} />}
      onPress={onPress}
      containerStyle={[style, styles.height]}
      style={styles.height}
      buttonStyle={styles.height}
    />
  );
};

const styles = StyleSheet.create({
  height: {
    height: '100%',
  },
});

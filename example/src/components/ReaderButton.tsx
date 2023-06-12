import React from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { Button, Icon } from '@rneui/themed';

export type ReaderButtonProps = {
  name: string;
  onPress: () => void;
  style?: ViewStyle;
};

export const ReaderButton: React.FC<ReaderButtonProps> = ({
  name,
  onPress,
  style = {},
}) => {
  return (
    <Button
      icon={<Icon name={name} size={60} />}
      containerStyle={[style, styles.height]}
      style={styles.height}
      buttonStyle={styles.height}
      onPress={onPress}
    />
  );
};

const styles = StyleSheet.create({
  height: {
    height: '100%',
  },
});

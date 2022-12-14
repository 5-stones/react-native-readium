import React from 'react';
import { StyleSheet } from 'react-native';
import { Button, Icon } from '@rneui/themed';

export interface ReaderButtonProps {
  name: string;
  onPress: () => void;
}

export const ReaderButton: React.FC<ReaderButtonProps> = ({
  name,
  onPress,
}) => {
  return (
    <Button
      icon={<Icon name={name} size={60} />}
      onPress={onPress}
      containerStyle={[{ width: '10%' }, styles.height]}
      style={styles.height}
      buttonStyle={styles.height}
    />
  );
}

const styles = StyleSheet.create({
  height: {
    height: '100%',
  },
});

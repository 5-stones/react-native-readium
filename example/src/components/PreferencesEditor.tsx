import React, { useState, useCallback } from 'react';
import { Text, ScrollView } from 'react-native';
import { ListItem, Overlay, Icon, Button } from '@rneui/themed';
import Slider from '@react-native-community/slider';
import type { ReadiumProps } from 'react-native-readium';
import { RANGES } from 'react-native-readium';

interface Props {
  preferences: ReadiumProps['preferences'];
  onChange: (preferences: ReadiumProps['preferences']) => void;
}

type Theme = NonNullable<ReadiumProps['preferences']['theme']>;

export const PreferencesEditor = ({ preferences, onChange }: Props) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const onToggleOpen = () => setIsOpen(!isOpen);
  const nextAppearance = useCallback((theme?: Theme) => {
    if (theme === 'light') {
      return 'dark';
    } else if (theme === 'dark') {
      return 'sepia';
    } else {
      return 'light';
    }
  }, []);

  return (
    <>
      <Icon name="gear" type="font-awesome" size={30} onPress={onToggleOpen} />
      <Overlay
        isVisible={isOpen}
        onBackdropPress={onToggleOpen}
        overlayStyle={{
          width: '90%',
          marginVertical: 100,
        }}
      >
        <ScrollView>
          <Text>Preferences</Text>
          <ListItem>
            <ListItem.Content>
              <ListItem.Title>Theme</ListItem.Title>
            </ListItem.Content>
            <Button
              title={preferences.theme}
              onPress={() => {
                onChange({
                  ...preferences,
                  theme: nextAppearance(preferences.theme),
                });
              }}
            />
          </ListItem>

          <ListItem>
            <ListItem.Content>
              <ListItem.Title>Font Size</ListItem.Title>
              <Slider
                style={{ width: '100%' }}
                minimumValue={RANGES.fontSize[0]}
                maximumValue={RANGES.fontSize[1]}
                step={0.1}
                value={preferences.fontSize}
                onSlidingComplete={(fontSize: number) => {
                  onChange({
                    ...preferences,
                    fontSize,
                    typeScale: fontSize,
                  });
                }}
                minimumTrackTintColor="#cccccc"
                maximumTrackTintColor="#aaaaaa"
              />
            </ListItem.Content>
          </ListItem>

          <ListItem>
            <ListItem.Content>
              <ListItem.Title>Page Margin</ListItem.Title>
              <Slider
                style={{ width: '100%' }}
                minimumValue={RANGES.pageMargins[0]}
                maximumValue={RANGES.pageMargins[1]}
                step={1}
                value={preferences.pageMargins}
                onSlidingComplete={(pageMargins: number) => {
                  onChange({
                    ...preferences,
                    pageMargins,
                  });
                }}
                minimumTrackTintColor="#cccccc"
                maximumTrackTintColor="#aaaaaa"
              />
            </ListItem.Content>
          </ListItem>
        </ScrollView>
      </Overlay>
    </>
  );
};

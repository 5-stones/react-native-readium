import React, { useState, useCallback } from 'react';
import { Text, ScrollView } from 'react-native';
import { ListItem, Overlay, Icon, Button } from '@rneui/themed';
import Slider from '@react-native-community/slider';
import type { Settings as ISettings } from 'react-native-readium';
import { Appearance, RANGES } from 'react-native-readium';

const getNameFromAppearance = (appearance?: Appearance): string => {
  switch (appearance) {
    case Appearance.DEFAULT:
      return 'Light';
    case Appearance.NIGHT:
      return 'Dark';
    case Appearance.SEPIA:
      return 'Sepia';
    default:
      return Appearance.DEFAULT;
  }
};

export interface SettingsProps {
  settings: Partial<ISettings>;
  onSettingsChanged: (settings: Partial<ISettings>) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  settings,
  onSettingsChanged,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const onToggleOpen = () => setIsOpen(!isOpen);
  const nextAppearance = useCallback((appearance?: Appearance) => {
  if (appearance === Appearance.DEFAULT) {
    return Appearance.NIGHT;
  } else if (appearance === Appearance.NIGHT) {
    return Appearance.SEPIA;
  } else {
    return Appearance.DEFAULT;
  }
}, []);

  return (
    <>
      <Icon
        name="gear"
        type="font-awesome"
        size={30}
        onPress={onToggleOpen}
      />
      <Overlay
        isVisible={isOpen}
        onBackdropPress={onToggleOpen}
        overlayStyle={{
          width: '90%',
          marginVertical: 100,
        }}
      >
        <ScrollView>
          <Text>Settings</Text>
          <ListItem>
            <ListItem.Content>
              <ListItem.Title>
                Theme
              </ListItem.Title>
            </ListItem.Content>
            <Button
              title={`${getNameFromAppearance(settings.appearance)}`}
              onPress={() => {
                onSettingsChanged({
                  ...settings,
                  appearance: nextAppearance(settings.appearance),
                });
              }}
            />
          </ListItem>

          <ListItem>
            <ListItem.Content>
              <ListItem.Title>
                Font Size
              </ListItem.Title>
              <Slider
                style={{ width: '100%' }}
                minimumValue={RANGES.fontSize[0]}
                maximumValue={RANGES.fontSize[1]}
                step={1}
                value={settings.fontSize}
                onSlidingComplete={(fontSize: number) => {
                  onSettingsChanged({
                    ...settings,
                    fontSize,
                  });
                }}
                minimumTrackTintColor="#cccccc"
                maximumTrackTintColor="#aaaaaa"
              />
            </ListItem.Content>
          </ListItem>

          <ListItem>
            <ListItem.Content>
              <ListItem.Title>
                Page Margin
              </ListItem.Title>
              <Slider
                style={{ width: '100%' }}
                minimumValue={RANGES.pageMargins[0]}
                maximumValue={RANGES.pageMargins[1]}
                step={1}
                value={settings.pageMargins}
                onSlidingComplete={(pageMargins: number) => {
                  onSettingsChanged({
                    ...settings,
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

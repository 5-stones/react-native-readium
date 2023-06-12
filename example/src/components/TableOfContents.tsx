import React, { useState } from 'react';
import { Text, ScrollView } from 'react-native';
import { ListItem, Overlay, Icon } from '@rneui/themed';
import type { Link } from 'react-native-readium';

export type TableOfContentsProps = {
  items?: Link[] | null;
  onPress?: (locator: Link) => void;
};

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  items: externalItems,
  onPress,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const onToggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const items = externalItems ?? [];

  return (
    <>
      <Icon name="list" type="font-awesome" size={30} onPress={onToggleOpen} />
      <Overlay
        isVisible={isOpen}
        overlayStyle={{
          width: '90%',
          marginVertical: 100,
        }}
        onBackdropPress={onToggleOpen}
      >
        <ScrollView>
          <Text>Table of Contents</Text>
          {items.map((item, idx) => (
            <ListItem
              key={`${item.href}${idx.toString()}`}
              bottomDivider={items.length - 1 !== idx}
              onPress={() => {
                if (onPress) {
                  onPress(item);
                  setIsOpen(false);
                }
              }}
            >
              <ListItem.Content>
                <ListItem.Title>
                  {item.title ? item.title : `Chapter ${idx + 1}`}
                </ListItem.Title>
              </ListItem.Content>
              <ListItem.Chevron />
            </ListItem>
          ))}
        </ScrollView>
      </Overlay>
    </>
  );
};

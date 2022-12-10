import React, { useState } from 'react';
import { Text, ScrollView } from 'react-native';
import { ListItem, Overlay, Icon } from '@rneui/themed';
// @ts-ignore - FIXME
import type { Link } from 'react-native-readium';

export interface TableOfContentsProps {
  items?: Link[] | null;
  onPress?: (locator: Link) => void;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  items: externalItems,
  onPress,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const onToggleOpen = () => setIsOpen(!isOpen);
  const items = externalItems || [];

  return (
    <>
      <Icon
        name="list"
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
          <Text>Table of Contents</Text>
          {items.map((item, idx) => (
            <ListItem
              key={idx}
              onPress={() => {
                if (onPress) {
                  onPress(item);
                  setIsOpen(false);
                }
              }}
              bottomDivider={items.length - 1 != idx}
            >
              <ListItem.Content>
                <ListItem.Title>
                  {item.title ? item.title : `Chapter ${idx + 1}`}
                </ListItem.Title>
              </ListItem.Content>
              <ListItem.Chevron/>
            </ListItem>
          ))}
        </ScrollView>
      </Overlay>
    </>
  );
}

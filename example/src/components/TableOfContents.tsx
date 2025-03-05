import React, { useState } from 'react';
import { Text, ScrollView, Modal, View, Dimensions } from 'react-native';
import { ListItem, Icon, Button } from '@rneui/themed';
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
      <Modal
        visible={isOpen}
        onRequestClose={onToggleOpen}
        presentationStyle='overFullScreen'
        backdropColor='transparent'
      >
        <View style={{
          height: Dimensions.get('window').height * 0.8,
          width: '95%',
          alignSelf: 'center',
          marginTop: '10%',
        }}>
          <Button onPress={() => setIsOpen(false)}>X</Button>
          <ScrollView style={{ maxHeight: '100%', width: '100%' }}>
            <Text>Table of Contents</Text>
            {items.map((item, idx) => (
              <React.Fragment key={idx}>
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
              </React.Fragment>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

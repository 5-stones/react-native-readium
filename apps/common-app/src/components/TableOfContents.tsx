import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Link } from 'react-native-readium';
import { ReaderButton } from './ReaderButton';
import { BaseModal } from './BaseModal';
import { modalStyles } from '../styles/modal';

export interface TableOfContentsProps {
  items?: Link[] | null;
  onPress?: (locator: Link) => void;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  items: externalItems,
  onPress,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const items = externalItems || [];

  const handleItemPress = (item: Link) => {
    if (onPress) {
      onPress(item);
      setIsOpen(false);
    }
  };

  return (
    <>
      <ReaderButton size={35} name="list" onPress={() => setIsOpen(true)} />

      <BaseModal
        visible={isOpen}
        title="Table of Contents"
        onClose={() => setIsOpen(false)}
      >
        {items.length === 0 ? (
          <Text style={modalStyles.emptyText}>
            No table of contents available
          </Text>
        ) : (
          items.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                modalStyles.cardItem,
                idx === items.length - 1 && modalStyles.cardItemLast,
              ]}
              onPress={() => handleItemPress(item)}
              activeOpacity={0.7}
            >
              <View style={styles.itemContent}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title ? item.title : `Chapter ${idx + 1}`}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </BaseModal>
    </>
  );
};

const styles = StyleSheet.create({
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#333333',
    marginRight: 12,
  },
  chevron: {
    fontSize: 24,
    color: '#999999',
    fontWeight: '300',
  },
});

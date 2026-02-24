import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Link } from 'react-native-readium';
import { ReaderButton } from './ReaderButton';
import { BaseModal } from './BaseModal';
import { modalStyles } from '../styles/modal';

export interface TableOfContentsProps {
  items?: Link[] | null;
  onPress?: (locator: Link) => void;
}

interface TocItemProps {
  item: Link;
  depth: number;
  onPress: (item: Link) => void;
  expandedItems: Set<string>;
  onToggle: (href: string) => void;
}

const TocItem: React.FC<TocItemProps> = ({
  item,
  depth,
  onPress,
  expandedItems,
  onToggle,
}) => {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.has(item.href);

  return (
    <>
      <TouchableOpacity
        style={[modalStyles.cardItem, { marginLeft: depth * 20 }]}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemContent}>
          {hasChildren ? (
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={(e) => {
                e.stopPropagation();
                onToggle(item.href);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.toggleIcon}>
                {isExpanded ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.togglePlaceholder} />
          )}
          <Text style={styles.title} numberOfLines={2}>
            {item.title || item.href}
          </Text>
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>
      {hasChildren && isExpanded &&
        item.children!.map((child, idx) => (
          <TocItem
            key={child.href + idx}
            item={child}
            depth={depth + 1}
            onPress={onPress}
            expandedItems={expandedItems}
            onToggle={onToggle}
          />
        ))}
    </>
  );
};

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  items: externalItems,
  onPress,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const items = externalItems || [];

  const handleToggle = useCallback((href: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  }, []);

  const handleItemPress = useCallback(
    (item: Link) => {
      if (onPress) {
        onPress(item);
        setIsOpen(false);
      }
    },
    [onPress]
  );

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
            <TocItem
              key={item.href + idx}
              item={item}
              depth={0}
              onPress={handleItemPress}
              expandedItems={expandedItems}
              onToggle={handleToggle}
            />
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
  toggleButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  togglePlaceholder: {
    width: 24,
    marginRight: 8,
  },
  toggleIcon: {
    fontSize: 12,
    color: '#666666',
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

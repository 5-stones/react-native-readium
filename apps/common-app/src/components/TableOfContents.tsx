import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { Link } from 'react-native-readium';
import { ReaderButton } from './ReaderButton';
import { BaseModal } from './BaseModal';
import { modalStyles } from '../styles/modal';
import { palette, radii, space, typography } from '../styles/theme';

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
        style={[styles.row, { paddingLeft: space.sm + depth * 18 }]}
        onPress={() => onPress(item)}
        activeOpacity={0.6}
      >
        {hasChildren ? (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={(e) => {
              e.stopPropagation();
              onToggle(item.href);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name={isExpanded ? 'keyboard-arrow-down' : 'chevron-right'}
              size={18}
              color={palette.textSecondary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.togglePlaceholder} />
        )}
        <Text style={styles.title} numberOfLines={2}>
          {item.title || item.href}
        </Text>
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
      <ReaderButton size={22} name="format-list-bulleted" onPress={() => setIsOpen(true)} />

      <BaseModal
        visible={isOpen}
        title="Contents"
        onClose={() => setIsOpen(false)}
      >
        {items.length === 0 ? (
          <Text style={modalStyles.emptyText}>
            No table of contents available
          </Text>
        ) : (
          <View style={styles.list}>
            {items.map((item, idx) => (
              <TocItem
                key={item.href + idx}
                item={item}
                depth={0}
                onPress={handleItemPress}
                expandedItems={expandedItems}
                onToggle={handleToggle}
              />
            ))}
          </View>
        )}
      </BaseModal>
    </>
  );
};

const styles = StyleSheet.create({
  list: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    paddingRight: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  toggleButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.sm,
  },
  togglePlaceholder: {
    width: 24,
    marginRight: space.sm,
  },
  title: {
    ...typography.body,
    flex: 1,
  },
});

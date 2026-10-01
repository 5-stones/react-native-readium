import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type Tab = 'library' | 'lcp';

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'library', label: 'Library', icon: 'menu-book' },
  { id: 'lcp', label: 'LCP', icon: 'lock' },
];

interface TabBarProps {
  selected: Tab;
  onSelect: (tab: Tab) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ selected, onSelect }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {tabs.map(({ id, label, icon }) => {
        const color = id === selected ? '#007AFF' : '#999';
        return (
          <TouchableOpacity
            key={id}
            testID={`tab-${id}`}
            style={styles.tab}
            onPress={() => onSelect(id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: id === selected }}
          >
            <MaterialIcons name={icon} size={24} color={color} />
            <Text style={[styles.label, { color }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDDDDD',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  label: { fontSize: 12, marginTop: 2 },
});

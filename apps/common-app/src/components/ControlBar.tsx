import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import type { ReadiumProps, Link, Decoration, Locator } from 'react-native-readium';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TableOfContents } from './TableOfContents';
import { PreferencesEditor } from './PreferencesEditor';
import { HighlightManager } from './highlights';

interface ControlBarProps {
  preferences: ReadiumProps['preferences'];
  onPreferencesChange: (preferences: ReadiumProps['preferences']) => void;
  toc: Link[] | null;
  onNavigateToTocItem: (item: Link) => void;
  highlights: Decoration[];
  onDeleteHighlight: (id: string) => void;
  onNavigateToHighlight: (locator: Locator) => void;
  onEditHighlight: (highlight: Decoration) => void;
  onClearBook: () => void;
  onClose: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  preferences,
  onPreferencesChange,
  toc,
  onNavigateToTocItem,
  highlights,
  onDeleteHighlight,
  onNavigateToHighlight,
  onEditHighlight,
  onClearBook,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
        accessibilityLabel="Close reader"
      >
        <MaterialIcons name="keyboard-arrow-down" size={28} color="#333" />
      </TouchableOpacity>

      <View style={styles.controls}>
        <View style={styles.iconButton}>
          <PreferencesEditor
            preferences={preferences}
            onChange={onPreferencesChange}
          />
        </View>

        <View style={styles.iconButton}>
          <TableOfContents items={toc} onPress={onNavigateToTocItem} />
        </View>

        <View style={styles.iconButton}>
          <HighlightManager
            highlights={highlights}
            onDeleteHighlight={onDeleteHighlight}
            onNavigateToHighlight={onNavigateToHighlight}
            onEditHighlight={onEditHighlight}
          />
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={onClearBook}
          accessibilityLabel="Clear book"
        >
          <MaterialIcons name="close" size={22} color="#999" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 48,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

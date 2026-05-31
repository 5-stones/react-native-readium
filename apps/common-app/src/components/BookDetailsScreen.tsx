import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BookOption } from '../types/reader.types';
import { palette, radii, space, typography, shadow } from '../styles/theme';

interface BookDetailsScreenProps {
  book: BookOption;
  onBack: () => void;
}

const COVER_TINTS: Array<[string, string]> = [
  ['#E9E4DA', '#2A2823'],
  ['#DDE7E1', '#1F3A2E'],
  ['#E8DEEA', '#3B2A4A'],
  ['#F4E1D2', '#5A2E18'],
  ['#D9E2F0', '#1F3A5C'],
  ['#EFE1DC', '#5C2B1F'],
];

const hashCode = (str: string) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

const tintFor = (id: string) => COVER_TINTS[hashCode(id) % COVER_TINTS.length];

const initialsFor = (title: string) =>
  title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

export const BookDetailsScreen: React.FC<BookDetailsScreenProps> = ({
  book,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const [bg, fg] = tintFor(book.id);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + space.xs }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onBack}
          accessibilityLabel="Back to reader"
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={palette.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Details
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.cover, { backgroundColor: bg }]}>
          <Text style={[styles.coverInitials, { color: fg }]}>
            {initialsFor(book.title)}
          </Text>
          <View style={[styles.coverSpine, { backgroundColor: fg }]} />
        </View>

        <Text style={styles.eyebrow}>Now Reading</Text>
        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.author}>{book.author}</Text>

        <View style={styles.card}>
          <Text style={styles.description}>
            A dedicated details screen for the selected publication. The reader
            remains on the navigation stack underneath, so returning preserves
            your reading position.
          </Text>
        </View>

        <TouchableOpacity style={styles.backToReaderButton} onPress={onBack}>
          <MaterialIcons
            name="chrome-reader-mode"
            size={18}
            color={palette.textInverse}
          />
          <Text style={styles.backToReaderButtonText}>Back to Reader</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingHorizontal: space.xs,
    paddingBottom: space.xs,
    minHeight: 48,
  },
  headerTitle: {
    ...typography.bodyStrong,
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: space.xxl,
    paddingTop: space.xxl,
    paddingBottom: space.xxxl,
    gap: space.sm,
  },
  cover: {
    width: 144,
    height: 200,
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: space.lg,
    overflow: 'hidden',
    ...shadow.md,
  },
  coverSpine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    opacity: 0.6,
  },
  coverInitials: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: 1,
  },
  eyebrow: {
    ...typography.caption,
    color: palette.textTertiary,
    marginBottom: space.xs,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
  },
  author: {
    ...typography.body,
    color: palette.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: space.lg,
    marginTop: space.xl,
  },
  description: {
    ...typography.body,
    color: palette.textSecondary,
    lineHeight: 22,
  },
  backToReaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: palette.accent,
    paddingHorizontal: space.xxl,
    paddingVertical: space.md + 2,
    borderRadius: radii.pill,
    marginTop: space.xxl,
  },
  backToReaderButtonText: {
    color: palette.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
});

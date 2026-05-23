import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BookOption } from '../types/reader.types';
import { palette, radii, space, typography, shadow } from '../styles/theme';

interface HomeScreenProps {
  books: BookOption[];
  onSelectBook: (book: BookOption) => void;
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

export const HomeScreen: React.FC<HomeScreenProps> = ({
  books,
  onSelectBook,
}) => {
  const insets = useSafeAreaInsets();

  const renderBook = ({ item }: { item: BookOption }) => {
    const [bg, fg] = tintFor(item.id);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onSelectBook(item)}
        activeOpacity={0.85}
      >
        <View style={[styles.cover, { backgroundColor: bg }]}>
          <Text style={[styles.coverInitials, { color: fg }]}>
            {initialsFor(item.title)}
          </Text>
          <View style={[styles.coverSpine, { backgroundColor: fg }]} />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.author} numberOfLines={1}>
            {item.author}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.statusDot} />
            <Text style={styles.status}>Not started</Text>
          </View>
        </View>

        <MaterialIcons
          name="chevron-right"
          size={22}
          color={palette.textTertiary}
        />
      </TouchableOpacity>
    );
  };

  const countLabel =
    books.length === 1 ? '1 book' : `${books.length} books`;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + space.xl }]}>
        <Text style={styles.eyebrow}>Your Library</Text>
        <Text style={styles.headerTitle}>Bookshelf</Text>
        <Text style={styles.headerSubtitle}>{countLabel}</Text>
      </View>

      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        renderItem={renderBook}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons
              name="auto-stories"
              size={40}
              color={palette.textTertiary}
            />
            <Text style={styles.emptyText}>Your library is empty</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  header: {
    paddingBottom: space.xl,
    paddingHorizontal: space.xl,
    backgroundColor: palette.bg,
  },
  eyebrow: {
    ...typography.caption,
    color: palette.textTertiary,
    marginBottom: space.xs,
  },
  headerTitle: {
    ...typography.display,
  },
  headerSubtitle: {
    ...typography.small,
    marginTop: space.xs,
  },
  list: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xxxl,
  },
  separator: {
    height: space.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadow.sm,
  },
  cover: {
    width: 56,
    height: 76,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: space.lg,
    overflow: 'hidden',
  },
  coverSpine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    opacity: 0.6,
  },
  coverInitials: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardContent: {
    flex: 1,
    marginRight: space.sm,
  },
  title: {
    ...typography.subtitle,
    marginBottom: 2,
  },
  author: {
    ...typography.small,
    color: palette.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.sm,
    gap: space.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.borderStrong,
  },
  status: {
    fontSize: 12,
    color: palette.textTertiary,
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xxxl * 2,
    gap: space.md,
  },
  emptyText: {
    ...typography.body,
    color: palette.textTertiary,
  },
});

import React from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BookOption } from '../types/reader.types';
import { useBookDownload } from '../hooks/useBookDownload';
import { badgesFor, formatOf, type BadgeTone } from '../utils/bookBadges';

interface HomeScreenProps {
  books: BookOption[];
  onSelectBook: (book: BookOption) => void;
  /** Rendered above the book list, e.g. an app's own import controls. */
  header?: React.ReactElement;
  title?: string;
}

/** What a publication is, where it is, and anything else worth knowing. */
const Badges: React.FC<{ book: BookOption; isStored: boolean }> = ({
  book,
  isStored,
}) => (
  <View style={styles.badges}>
    {badgesFor(book, { isStored }).map(({ label, tone }) => (
      <View key={label} style={[styles.badge, tones[`${tone}Badge`]]}>
        <Text style={[styles.badgeLabel, tones[`${tone}Label`]]}>{label}</Text>
      </View>
    ))}
  </View>
);

/**
 * One book in the library, with whether a copy of it is stored.
 *
 * A row of its own because each asks the filesystem about itself, and a hook
 * cannot be called from inside a list's render callback.
 */
const BookRow: React.FC<{
  book: BookOption;
  onSelect: (book: BookOption) => void;
}> = ({ book, onSelect }) => {
  const { isDownloaded, isDownloading, canDownload, error, download, remove } =
    useBookDownload(book.asset);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onSelect(book)}
      activeOpacity={0.7}
    >
      {/* The format, where a generic book icon used to be: it is the one
          thing every row has, so it belongs here rather than among the
          badges, which say what is particular about a publication. */}
      <View style={styles.iconContainer}>
        <Text style={styles.format}>{formatOf(book.asset)}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.title} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {book.author}
        </Text>
        <Badges book={book} isStored={isDownloaded} />
        {error ? (
          // Without this a refused download looks like a button that does
          // nothing at all.
          <Text style={styles.downloadError} numberOfLines={3}>
            {error.message}
          </Text>
        ) : null}
      </View>

      {canDownload && (
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={isDownloaded ? remove : download}
          disabled={isDownloading}
          // The row beneath would otherwise open the book as well.
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={
            isDownloaded ? 'Delete the stored copy' : 'Store a copy'
          }
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <MaterialIcons
              name={isDownloaded ? 'delete' : 'file-download'}
              size={24}
              color={isDownloaded ? '#b3261e' : '#007AFF'}
            />
          )}
        </TouchableOpacity>
      )}

      <MaterialIcons name="chevron-right" size={24} color="#999" />
    </TouchableOpacity>
  );
};

export const HomeScreen: React.FC<HomeScreenProps> = ({
  books,
  onSelectBook,
  header,
  title = 'Library',
}) => {
  const insets = useSafeAreaInsets();

  const renderBook = ({ item }: { item: BookOption }) => (
    <BookRow book={item} onSelect={onSelectBook} />
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        renderItem={renderBook}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
  },
  list: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  format: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#007AFF',
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  author: {
    fontSize: 13,
    color: '#666666',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    // Each badge carries its own spacing rather than the row using `gap`,
    // which react-native-web has been uneven about; this negative margin
    // takes back the last wrapped row's.
    marginBottom: -4,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 4,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  downloadError: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 15,
    color: '#b3261e',
  },
  downloadButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
});

/** A background and a text colour for each {@link BadgeTone}. */
const tones = StyleSheet.create({
  neutralBadge: { backgroundColor: '#EFEFEF' },
  neutralLabel: { color: '#5F5F5F' },
  infoBadge: { backgroundColor: '#EBF5FF' },
  infoLabel: { color: '#0A66C2' },
  successBadge: { backgroundColor: '#E7F6EC' },
  successLabel: { color: '#1E7B34' },
  cautionBadge: { backgroundColor: '#FFF3E0' },
  cautionLabel: { color: '#8A5300' },
});

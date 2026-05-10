import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BookOption } from '../types/reader.types';

interface HomeScreenProps {
  books: BookOption[];
  onSelectBook: (book: BookOption) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  books,
  onSelectBook,
}) => {
  const insets = useSafeAreaInsets();

  const renderBook = ({ item }: { item: BookOption }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onSelectBook(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, item.format === 'cbz' && styles.iconContainerCbz]}>
        <MaterialIcons
          name={item.format === 'cbz' ? 'image' : 'menu-book'}
          size={32}
          color={item.format === 'cbz' ? '#FF6B35' : '#007AFF'}
        />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {item.author}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#999" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Library</Text>
      </View>
      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        renderItem={renderBook}
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
  iconContainerCbz: {
    backgroundColor: '#FFF0EB',
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
});

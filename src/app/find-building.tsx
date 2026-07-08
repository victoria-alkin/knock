import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const mockBuildings = [
  {
    id: 'mason',
    name: 'The Mason',
    address: '123 Main St, Boston, MA',
  },
  {
    id: 'mason-north',
    name: 'The Mason North Tower',
    address: '125 Main St, Boston, MA',
  },
  {
    id: 'harbor-view',
    name: 'Harbor View Apartments',
    address: '50 Seaport Blvd, Boston, MA',
  },
  {
    id: 'parkline',
    name: 'Parkline Residences',
    address: '88 Park Ave, Boston, MA',
  },
];

export default function FindBuildingScreen() {
  const [searchText, setSearchText] = useState('');

  const filteredBuildings = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return mockBuildings;
    }

    return mockBuildings.filter((building) => {
      return (
        building.name.toLowerCase().includes(query) ||
        building.address.toLowerCase().includes(query)
      );
    });
  }, [searchText]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Find Your Building</Text>

        <Text style={styles.title}>Where do you live?</Text>

        <Text style={styles.description}>
          Search for your apartment building by name or address.
        </Text>

        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search your building name or address"
          placeholderTextColor="#9B8CAF"
          style={styles.searchInput}
        />

        <FlatList
          data={filteredBuildings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable style={styles.buildingCard}>
              <View>
                <Text style={styles.buildingName}>{item.name}</Text>
                <Text style={styles.buildingAddress}>{item.address}</Text>
              </View>

              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No buildings found</Text>
              <Text style={styles.emptyText}>
                Try searching by a different name or address.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F2FF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  eyebrow: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6D28D9',
    marginBottom: 14,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 12,
  },
  description: {
    fontSize: 17,
    color: '#67597F',
    lineHeight: 24,
    marginBottom: 26,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F1438',
    borderWidth: 1,
    borderColor: '#E5DDF5',
    marginBottom: 18,
  },
  listContent: {
    gap: 12,
    paddingBottom: 32,
  },
  buildingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buildingName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 5,
  },
  buildingAddress: {
    fontSize: 15,
    color: '#76698C',
  },
  chevron: {
    fontSize: 32,
    color: '#6D28D9',
    marginLeft: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#76698C',
    textAlign: 'center',
  },
});
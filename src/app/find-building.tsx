import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BuildingSuggestion,
  getBuildingDetails,
  newSessionToken,
  searchBuildings,
} from '@/lib/buildings';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export default function FindBuildingScreen() {
  const router = useRouter();

  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<BuildingSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  // One Places "session" spans the keystrokes plus the final selection.
  const sessionToken = useRef(newSessionToken());

  useEffect(() => {
    const query = searchText.trim();

    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const results = await searchBuildings(
          query,
          sessionToken.current,
          controller.signal,
        );
        setSuggestions(results);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError("Couldn't load buildings. Check your connection and try again.");
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [searchText]);

  const handleSelect = async (building: BuildingSuggestion) => {
    setSelectingId(building.placeId);
    setError(null);

    try {
      const details = await getBuildingDetails(
        building.placeId,
        sessionToken.current,
      );

      // The session is now spent — start a fresh one for the next search.
      sessionToken.current = newSessionToken();

      router.push({
        pathname: '/confirm-building',
        params: {
          placeId: details.placeId,
          name: details.name || building.name,
          address: details.address || building.address,
          latitude: details.latitude != null ? String(details.latitude) : '',
          longitude: details.longitude != null ? String(details.longitude) : '',
        },
      });
    } catch {
      setError("Couldn't open that building. Please try again.");
    } finally {
      setSelectingId(null);
    }
  };

  const showEmptyState =
    !loading &&
    !error &&
    searchText.trim().length >= MIN_QUERY_LENGTH &&
    suggestions.length === 0;

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
          autoCorrect={false}
          autoCapitalize="words"
        />

        {loading && (
          <View style={styles.inlineStatus}>
            <ActivityIndicator color="#6D28D9" />
            <Text style={styles.inlineStatusText}>Searching…</Text>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.placeId}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={styles.buildingCard}
              disabled={selectingId !== null}
              onPress={() => handleSelect(item)}
            >
              <View style={styles.buildingInfo}>
                <Text style={styles.buildingName}>{item.name}</Text>
                {item.address ? (
                  <Text style={styles.buildingAddress}>{item.address}</Text>
                ) : null}
              </View>

              {selectingId === item.placeId ? (
                <ActivityIndicator color="#6D28D9" />
              ) : (
                <Text style={styles.chevron}>›</Text>
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            showEmptyState ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No buildings found</Text>
                <Text style={styles.emptyText}>
                  Try searching by a different name or address.
                </Text>
              </View>
            ) : null
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
  inlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  inlineStatusText: {
    fontSize: 15,
    color: '#76698C',
  },
  errorText: {
    fontSize: 15,
    color: '#B4243F',
    marginBottom: 14,
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
  buildingInfo: {
    flex: 1,
    paddingRight: 12,
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

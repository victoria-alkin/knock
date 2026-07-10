import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  fetchListings,
  KIND_LABEL,
  Listing,
  listingPriceLabel,
} from '@/lib/marketplace';
import { getMyBuilding } from '@/lib/membership';

export default function MarketplaceScreen() {
  const router = useRouter();
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const building = await getMyBuilding();
      if (active) setBuildingId(building?.id ?? null);
    })();
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!buildingId) return;
        const rows = await fetchListings(buildingId);
        if (active) {
          setListings(rows);
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [buildingId]),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.emoji}>🛍️</Text>
          <Text style={styles.title}>Marketplace</Text>
        </View>
        <Text style={styles.subtitle}>
          Buy, sell, give away, or find things in your building.
        </Text>

        <Pressable
          style={styles.createButton}
          onPress={() => router.push('/create-listing')}
        >
          <Text style={styles.createButtonText}>+ New listing</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator color="#6D28D9" style={styles.loader} />
        ) : listings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nothing listed yet</Text>
            <Text style={styles.emptyText}>
              Post the first listing — sell something, give it away, or ask for
              what you need.
            </Text>
          </View>
        ) : (
          listings.map((listing) => (
            <Pressable
              key={listing.id}
              style={styles.listingCard}
              onPress={() =>
                router.push({
                  pathname: '/listing/[listingId]',
                  params: { listingId: listing.id },
                })
              }
            >
              <View style={styles.listingTop}>
                <Text style={styles.kindBadge}>{KIND_LABEL[listing.kind]}</Text>
                {listing.status === 'sold' ? (
                  <Text style={styles.soldBadge}>Sold</Text>
                ) : null}
              </View>
              <Text style={styles.listingTitle}>{listing.title}</Text>
              <View style={styles.listingFooter}>
                <Text style={styles.price}>{listingPriceLabel(listing)}</Text>
                <Text style={styles.seller}>{listing.sellerName}</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F2FF' },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  back: { fontSize: 16, color: '#6D28D9', fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  emoji: { fontSize: 28 },
  title: { fontSize: 30, fontWeight: '900', color: '#1F1438' },
  subtitle: { fontSize: 15, color: '#67597F', marginBottom: 20, lineHeight: 21 },
  createButton: {
    backgroundColor: '#6D28D9',
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 22,
  },
  createButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  loader: { marginTop: 40 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#76698C',
    textAlign: 'center',
    lineHeight: 22,
  },
  listingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    marginBottom: 12,
  },
  listingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kindBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6D28D9',
    backgroundColor: '#F1ECFA',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  soldBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#76698C',
    backgroundColor: '#ECE7F5',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  listingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 10,
  },
  listingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: { fontSize: 16, fontWeight: '800', color: '#1B873F' },
  seller: { fontSize: 14, color: '#76698C' },
});

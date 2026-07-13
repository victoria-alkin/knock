import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { startConversation } from '@/lib/dms';
import {
  deleteListing,
  fetchListing,
  getCurrentUserId,
  KIND_LABEL,
  Listing,
  listingPriceLabel,
  markListingSold,
} from '@/lib/marketplace';

export default function ListingDetailScreen() {
  const router = useRouter();
  const { listingId } = useLocalSearchParams<{ listingId: string }>();

  const [listing, setListing] = useState<Listing | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const load = useCallback(async () => {
    if (!listingId) return;
    const [l, uid] = await Promise.all([
      fetchListing(listingId),
      getCurrentUserId(),
    ]);
    setListing(l);
    setCurrentUserId(uid);
    setLoading(false);
  }, [listingId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (active) await load();
      })();
      return () => {
        active = false;
      };
    }, [load]),
  );

  const handleMarkSold = async () => {
    if (!listingId) return;
    setWorking(true);
    await markListingSold(listingId);
    await load();
    setWorking(false);
  };

  const handleDelete = async () => {
    if (!listingId) return;
    await deleteListing(listingId);
    router.back();
  };

  const handleMessageSeller = async () => {
    if (!listing) return;
    const { id, error } = await startConversation(listing.sellerId);
    if (error || !id) return;
    router.push({
      pathname: '/dm/[conversationId]',
      params: { conversationId: id, otherName: listing.sellerName },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#6D28D9" />
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>This listing is no longer available.</Text>
      </SafeAreaView>
    );
  }

  const isOwner = listing.sellerId === currentUserId;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {listing.imageUrl ? (
          <Image source={{ uri: listing.imageUrl }} style={styles.image} />
        ) : null}
        <View style={styles.topRow}>
          <Text style={styles.kindBadge}>{KIND_LABEL[listing.kind]}</Text>
          {listing.status === 'sold' ? (
            <Text style={styles.soldBadge}>Sold</Text>
          ) : null}
        </View>

        <Text style={styles.title}>{listing.title}</Text>
        <Text style={styles.price}>{listingPriceLabel(listing)}</Text>
        <Text style={styles.seller}>Listed by {listing.sellerName}</Text>

        {listing.description ? (
          <Text style={styles.description}>{listing.description}</Text>
        ) : null}

        {isOwner ? (
          <View style={styles.ownerActions}>
            {listing.status === 'available' ? (
              <Pressable
                style={styles.soldButton}
                disabled={working}
                onPress={handleMarkSold}
              >
                <Text style={styles.soldButtonText}>
                  {working ? '…' : 'Mark as sold'}
                </Text>
              </Pressable>
            ) : null}

            {confirmingDelete ? (
              <View style={styles.confirmRow}>
                <Text style={styles.confirmText}>Delete this listing?</Text>
                <Pressable onPress={handleDelete}>
                  <Text style={styles.confirmYes}>Delete</Text>
                </Pressable>
                <Pressable onPress={() => setConfirmingDelete(false)}>
                  <Text style={styles.confirmCancel}>Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setConfirmingDelete(true)}>
                <Text style={styles.deleteLink}>Delete listing</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable style={styles.messageButton} onPress={handleMessageSeller}>
            <Text style={styles.messageButtonText}>
              Message {listing.sellerName}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  back: { fontSize: 16, color: '#6D28D9', fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  image: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    marginBottom: 16,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
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
  title: { fontSize: 28, fontWeight: '900', color: '#1F1438', marginBottom: 6 },
  price: { fontSize: 22, fontWeight: '800', color: '#1B873F', marginBottom: 8 },
  seller: { fontSize: 15, color: '#76698C', marginBottom: 18 },
  description: {
    fontSize: 16,
    color: '#2C2340',
    lineHeight: 23,
    marginBottom: 20,
  },
  ownerActions: { marginTop: 6, gap: 14 },
  soldButton: {
    backgroundColor: '#6D28D9',
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
  },
  soldButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  deleteLink: { fontSize: 15, fontWeight: '700', color: '#B4243F' },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  confirmText: { fontSize: 14, color: '#67597F', marginRight: 'auto' },
  confirmYes: { fontSize: 14, fontWeight: '800', color: '#B4243F' },
  confirmCancel: { fontSize: 14, fontWeight: '700', color: '#6D28D9' },
  messageButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#6D28D9',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 22,
    marginTop: 6,
  },
  messageButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  emptyText: { fontSize: 15, color: '#76698C' },
});

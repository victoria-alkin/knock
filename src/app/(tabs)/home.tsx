import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CHANNELS } from '@/constants/channels';
import { getMyBuilding, MyBuilding } from '@/lib/membership';

export default function HomeScreen() {
  const router = useRouter();
  const [building, setBuilding] = useState<MyBuilding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await getMyBuilding();
      if (active) {
        setBuilding(result);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#6D28D9" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.wordmark}>Knock</Text>

        <View style={styles.buildingCard}>
          <Text style={styles.buildingName}>
            {building?.name ?? 'Your building'}
          </Text>
          {building?.address ? (
            <Text style={styles.buildingAddress}>{building.address}</Text>
          ) : null}
          <View
            style={[
              styles.badge,
              building?.verified ? styles.badgeVerified : styles.badgePending,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                building?.verified
                  ? styles.badgeTextVerified
                  : styles.badgeTextPending,
              ]}
            >
              {building?.verified ? '✓ Verified building' : 'Pending verification'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Channels</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.channelRow}
        >
          {CHANNELS.map((channel) => (
            <Pressable
              key={channel.key}
              style={styles.channelChip}
              onPress={() => router.push('/channels')}
            >
              <Text style={styles.channelEmoji}>{channel.emoji}</Text>
              <Text style={styles.channelName}>{channel.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Recent activity</Text>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptyText}>
            Be the first to post in {building?.name ?? 'your building'}. Say hi,
            ask for help, or start an event.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F2FF',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  wordmark: {
    fontSize: 26,
    fontWeight: '900',
    color: '#6D28D9',
    textAlign: 'center',
    marginBottom: 18,
  },
  buildingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    marginBottom: 24,
  },
  buildingName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 4,
  },
  buildingAddress: {
    fontSize: 15,
    color: '#76698C',
    marginBottom: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  badgeVerified: {
    backgroundColor: '#E4F6EA',
  },
  badgePending: {
    backgroundColor: '#F1ECFA',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  badgeTextVerified: {
    color: '#1B873F',
  },
  badgeTextPending: {
    color: '#6D28D9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 12,
  },
  channelRow: {
    gap: 12,
    paddingBottom: 24,
    paddingRight: 8,
  },
  channelChip: {
    width: 84,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
  },
  channelEmoji: {
    fontSize: 24,
  },
  channelName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A3D63',
    textAlign: 'center',
  },
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
});

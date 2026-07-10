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

import { EventSummary, fetchEvents, formatEventTime } from '@/lib/events';
import { getMyBuilding } from '@/lib/membership';

export default function EventsScreen() {
  const router = useRouter();
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventSummary[]>([]);
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
        const rows = await fetchEvents(buildingId);
        if (active) {
          setEvents(rows);
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
          <Text style={styles.emoji}>📅</Text>
          <Text style={styles.title}>Events</Text>
        </View>
        <Text style={styles.subtitle}>
          What&apos;s happening in your building.
        </Text>

        <Pressable
          style={styles.createButton}
          onPress={() => router.push('/create-event')}
        >
          <Text style={styles.createButtonText}>+ Create event</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator color="#6D28D9" style={styles.loader} />
        ) : events.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No upcoming events</Text>
            <Text style={styles.emptyText}>
              Host the first one — rooftop drinks, game night, anything.
            </Text>
          </View>
        ) : (
          events.map((event) => (
            <Pressable
              key={event.id}
              style={styles.eventCard}
              onPress={() =>
                router.push({
                  pathname: '/event/[eventId]',
                  params: { eventId: event.id },
                })
              }
            >
              <Text style={styles.eventTime}>
                {formatEventTime(event.startsAt)}
              </Text>
              <Text style={styles.eventTitle}>{event.title}</Text>
              {event.location ? (
                <Text style={styles.eventLocation}>📍 {event.location}</Text>
              ) : null}
              <View style={styles.eventFooter}>
                <Text style={styles.eventGoing}>
                  {event.goingCount} going
                </Text>
                {event.myStatus === 'going' ? (
                  <Text style={styles.youBadge}>You&apos;re going</Text>
                ) : null}
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
  subtitle: {
    fontSize: 15,
    color: '#67597F',
    marginBottom: 20,
  },
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
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    marginBottom: 12,
  },
  eventTime: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6D28D9',
    marginBottom: 6,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 6,
  },
  eventLocation: { fontSize: 14, color: '#76698C', marginBottom: 10 },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventGoing: { fontSize: 14, color: '#4A3D63', fontWeight: '700' },
  youBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1B873F',
    backgroundColor: '#E4F6EA',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
});

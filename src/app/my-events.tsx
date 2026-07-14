import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchMyEvents, formatEventTime, MyEvent } from '@/lib/events';

export default function MyEventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<MyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setEvents(await fetchMyEvents());
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const rows = await fetchMyEvents();
        if (active) {
          setEvents(rows);
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const now = Date.now();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6D28D9"
            colors={['#6D28D9']}
          />
        }
      >
        <Text style={styles.title}>My Events</Text>

        {loading ? (
          <ActivityIndicator color="#6D28D9" style={styles.loader} />
        ) : events.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.emptyText}>
              Events you host or RSVP to will show up here.
            </Text>
          </View>
        ) : (
          events.map((event) => {
            const past = new Date(event.startsAt).getTime() < now;
            return (
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
                {event.imageUrl ? (
                  <Image
                    source={{ uri: event.imageUrl }}
                    style={styles.eventImage}
                  />
                ) : null}
                <View style={styles.timeRow}>
                  <Text style={styles.eventTime}>
                    {formatEventTime(event.startsAt)}
                  </Text>
                  <View style={styles.badges}>
                    <Text
                      style={[
                        styles.flag,
                        event.relation === 'hosted'
                          ? styles.flagHosted
                          : styles.flagAttended,
                      ]}
                    >
                      {event.relation === 'hosted'
                        ? 'Hosted'
                        : past
                          ? 'Attended'
                          : 'Attending'}
                    </Text>
                    {past ? <Text style={styles.pastBadge}>Past</Text> : null}
                  </View>
                </View>
                <Text style={styles.eventTitle}>{event.title}</Text>
                {event.location ? (
                  <Text style={styles.eventLocation}>📍 {event.location}</Text>
                ) : null}
                <Text style={styles.eventGoing}>{event.goingCount} going</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  back: { fontSize: 16, color: '#6D28D9', fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1F1438',
    marginBottom: 20,
  },
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
  eventImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  eventTime: { fontSize: 13, fontWeight: '800', color: '#6D28D9' },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flag: {
    fontSize: 12,
    fontWeight: '800',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  flagHosted: { color: '#6D28D9', backgroundColor: '#F1ECFA' },
  flagAttended: { color: '#1B873F', backgroundColor: '#E4F6EA' },
  pastBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#76698C',
    backgroundColor: '#ECE7F5',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 6,
  },
  eventLocation: { fontSize: 14, color: '#76698C', marginBottom: 10 },
  eventGoing: { fontSize: 14, color: '#4A3D63', fontWeight: '700' },
});

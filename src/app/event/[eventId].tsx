import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import {
  EventDetail,
  fetchEvent,
  formatEventTime,
  RsvpStatus,
  setRsvp,
} from '@/lib/events';

const OPTIONS: { status: RsvpStatus; label: string }[] = [
  { status: 'going', label: 'Going' },
  { status: 'maybe', label: 'Maybe' },
  { status: 'not_going', label: 'Not going' },
];

export default function EventDetailScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return;
    const detail = await fetchEvent(eventId);
    setEvent(detail);
    setLoading(false);
  }, [eventId]);

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

  const handleRsvp = async (status: RsvpStatus) => {
    if (!eventId) return;
    setUpdating(true);
    await setRsvp(eventId, status);
    await load();
    setUpdating(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#6D28D9" />
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>This event is no longer available.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.time}>{formatEventTime(event.startsAt)}</Text>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.host}>Hosted by {event.hostName}</Text>

        {event.location ? (
          <Text style={styles.location}>📍 {event.location}</Text>
        ) : null}
        {event.description ? (
          <Text style={styles.description}>{event.description}</Text>
        ) : null}

        <Text style={styles.counts}>
          {event.goingCount} going · {event.maybeCount} maybe ·{' '}
          {event.notGoingCount} not going
        </Text>

        <Text style={styles.sectionLabel}>Your response</Text>
        <View style={styles.rsvpRow}>
          {OPTIONS.map((option) => {
            const selected = event.myStatus === option.status;
            return (
              <Pressable
                key={option.status}
                style={[styles.rsvpButton, selected && styles.rsvpButtonOn]}
                disabled={updating}
                onPress={() => handleRsvp(option.status)}
              >
                <Text
                  style={[
                    styles.rsvpText,
                    selected && styles.rsvpTextOn,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {event.going.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Going</Text>
            {event.going.map((attendee, i) => (
              <View key={`${attendee.name}-${i}`} style={styles.attendeeRow}>
                <Avatar name={attendee.name} url={attendee.avatar} size={36} />
                <Text style={styles.attendeeName}>{attendee.name}</Text>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F2FF' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  back: { fontSize: 16, color: '#6D28D9', fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  time: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6D28D9',
    marginBottom: 6,
  },
  title: { fontSize: 28, fontWeight: '900', color: '#1F1438', marginBottom: 4 },
  host: { fontSize: 15, color: '#76698C', marginBottom: 16 },
  location: { fontSize: 15, color: '#2C2340', marginBottom: 10 },
  description: {
    fontSize: 16,
    color: '#2C2340',
    lineHeight: 23,
    marginBottom: 16,
  },
  counts: {
    fontSize: 14,
    color: '#4A3D63',
    fontWeight: '700',
    marginBottom: 22,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4A3D63',
    marginBottom: 12,
  },
  rsvpRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  rsvpButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    paddingVertical: 14,
    alignItems: 'center',
  },
  rsvpButtonOn: { backgroundColor: '#6D28D9', borderColor: '#6D28D9' },
  rsvpText: { fontSize: 15, fontWeight: '800', color: '#4A3D63' },
  rsvpTextOn: { color: '#FFFFFF' },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  attendeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeInitial: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  attendeeName: { fontSize: 16, color: '#1F1438', fontWeight: '600' },
  emptyText: { fontSize: 15, color: '#76698C' },
});

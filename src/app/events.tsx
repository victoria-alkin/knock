import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icon';
import { channelIcons } from '@/constants/icons';
import {
  EventSummary,
  fetchEvents,
  fetchMyEvents,
  formatEventTime,
  MyEventRelation,
} from '@/lib/events';
import { getMyBuilding } from '@/lib/membership';

type Filter = 'upcoming' | 'week' | 'month' | 'mine';

const RELATION_LABEL: Record<MyEventRelation, string> = {
  hosted: 'Hosting',
  attended: 'Going',
  maybe: 'Maybe',
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'mine', label: 'My Events' },
];

export default function EventsScreen() {
  const router = useRouter();
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [myScope, setMyScope] = useState<'upcoming' | 'past'>('upcoming');
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const fetchForFilter = useCallback(async (): Promise<EventSummary[]> => {
    if (filter === 'mine') {
      const mine = await fetchMyEvents();
      const now = Date.now();
      return mine.filter((e) =>
        myScope === 'past'
          ? new Date(e.startsAt).getTime() < now
          : new Date(e.startsAt).getTime() >= now,
      );
    }
    if (!buildingId) return [];
    const all = await fetchEvents(buildingId);
    if (filter === 'week') {
      const end = Date.now() + 7 * 86400000;
      return all.filter((e) => new Date(e.startsAt).getTime() <= end);
    }
    if (filter === 'month') {
      const d = new Date();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      return all.filter((e) => new Date(e.startsAt).getTime() <= end.getTime());
    }
    return all;
  }, [buildingId, filter, myScope]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setEvents(await fetchForFilter());
    setRefreshing(false);
  }, [fetchForFilter]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const rows = await fetchForFilter();
        if (active) {
          setEvents(rows);
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [fetchForFilter]),
  );

  const openCreate = () => router.push('/create-event');

  const query = search.trim().toLowerCase();
  const visibleEvents = query
    ? events.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          (e.location ?? '').toLowerCase().includes(query),
      )
    : events;

  const renderEvent = (event: EventSummary) => {
    const d = new Date(event.startsAt);
    const month = d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
    const weekday = d
      .toLocaleDateString(undefined, { weekday: 'short' })
      .toUpperCase();
    const relation = event.relation;

    return (
      <Pressable
        key={event.id}
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: '/event/[eventId]',
            params: { eventId: event.id },
          })
        }
      >
        <View style={styles.coverWrap}>
          {event.imageUrl ? (
            <Image source={{ uri: event.imageUrl }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Icon source={channelIcons.events} size={34} color="#B9A9D4" />
            </View>
          )}
          <View style={styles.dateChip}>
            <Text style={styles.dateMonth}>{month}</Text>
            <Text style={styles.dateDay}>{d.getDate()}</Text>
            <Text style={styles.dateWeekday}>{weekday}</Text>
          </View>
          {relation ? (
            <View
              style={[
                styles.relBadge,
                relation === 'hosted'
                  ? styles.relHosted
                  : relation === 'maybe'
                    ? styles.relMaybe
                    : styles.relGoing,
              ]}
            >
              <Text style={styles.relBadgeText}>{RELATION_LABEL[relation]}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={styles.eventDateTime}>
            {formatEventTime(event.startsAt)}
          </Text>
          {event.location ? (
            <View style={styles.locRow}>
              <Feather name="map-pin" size={13} color="#8A7BA3" />
              <Text style={styles.eventLocation} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
          ) : null}

          <View style={styles.attendeeRow}>
            <View style={styles.avatars}>
              {event.goingPeople.slice(0, 3).map((p, i) => (
                <View
                  key={i}
                  style={[styles.avatarWrap, i > 0 && styles.avatarOverlap]}
                >
                  <Avatar name={p.name} url={p.avatar} size={24} />
                </View>
              ))}
            </View>
            <Text style={styles.goingText}>{event.goingCount} going</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.headerSide}
        >
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.pageTitle}>Events</Text>
        <View style={styles.headerSide} />
      </View>

      <View style={styles.tabs}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={styles.tab}
            onPress={() => {
              setFilter(f.key);
              setMyScope('upcoming');
            }}
          >
            <Text
              style={[styles.tabText, filter === f.key && styles.tabTextActive]}
            >
              {f.label}
            </Text>
            {filter === f.key ? <View style={styles.tabUnderline} /> : null}
          </Pressable>
        ))}
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
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="#9B8CAF" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search events"
            placeholderTextColor="#9B8CAF"
            style={styles.searchInput}
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Feather name="x" size={16} color="#9B8CAF" />
            </Pressable>
          ) : null}
        </View>

        <Pressable style={styles.createBtn} onPress={openCreate}>
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Create an event</Text>
        </Pressable>

        {filter === 'mine' ? (
          <View style={styles.segment}>
            {(['upcoming', 'past'] as const).map((scope) => (
              <Pressable
                key={scope}
                style={[
                  styles.segmentBtn,
                  myScope === scope && styles.segmentBtnActive,
                ]}
                onPress={() => setMyScope(scope)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    myScope === scope && styles.segmentTextActive,
                  ]}
                >
                  {scope === 'upcoming' ? 'Upcoming' : 'Past'}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color="#6D28D9" style={styles.loader} />
        ) : visibleEvents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {query ? 'No matches' : 'Nothing here'}
            </Text>
            <Text style={styles.emptyText}>
              {query
                ? `No events match "${search.trim()}".`
                : filter === 'mine'
                  ? myScope === 'past'
                    ? "You don't have any past events yet."
                    : 'Events you host or RSVP to will show up here.'
                  : 'Host the first one: rooftop drinks, game night, anything.'}
            </Text>
          </View>
        ) : (
          visibleEvents.map(renderEvent)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 6,
  },
  headerSide: { width: 60 },
  back: { fontSize: 16, color: '#6D28D9', fontWeight: '700' },
  pageTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: '#1F1438',
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  tab: { alignItems: 'center', paddingBottom: 8 },
  tabText: { fontSize: 14, fontWeight: '700', color: '#9B8CAF' },
  tabTextActive: { color: '#6D28D9' },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: '100%',
    borderRadius: 999,
    backgroundColor: '#6D28D9',
  },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F1F8',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F1438',
    fontWeight: '600',
    padding: 0,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6D28D9',
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 20,
  },
  createBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#F3F1F8',
    borderRadius: 12,
    padding: 3,
    marginBottom: 18,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentBtnActive: { backgroundColor: '#6D28D9' },
  segmentText: { fontSize: 14, fontWeight: '700', color: '#76698C' },
  segmentTextActive: { color: '#FFFFFF' },
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    overflow: 'hidden',
    marginBottom: 16,
  },
  coverWrap: { position: 'relative' },
  cover: { width: '100%', height: 160 },
  coverPlaceholder: {
    backgroundColor: '#F3F1F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChip: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 52,
    shadowColor: '#1F1438',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  relBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  relBadgeText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  relHosted: { backgroundColor: '#6D28D9' },
  relGoing: { backgroundColor: '#1B873F' },
  relMaybe: { backgroundColor: '#B4841F' },
  dateMonth: { fontSize: 11, fontWeight: '800', color: '#6D28D9' },
  dateDay: { fontSize: 20, fontWeight: '900', color: '#1F1438', lineHeight: 24 },
  dateWeekday: { fontSize: 10, fontWeight: '700', color: '#8A7BA3' },
  cardBody: { padding: 16 },
  eventTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 6,
  },
  eventDateTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6D28D9',
    marginBottom: 8,
  },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  eventLocation: { flex: 1, fontSize: 14, color: '#76698C' },
  attendeeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatars: { flexDirection: 'row' },
  avatarWrap: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarOverlap: { marginLeft: -10 },
  goingText: { fontSize: 13, color: '#4A3D63', fontWeight: '700' },
});

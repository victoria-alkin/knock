import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import {
  AppNotification,
  fetchNotifications,
  markAllRead,
} from '@/lib/notifications';
import { formatEventTime } from '@/lib/events';
import { relativeTime } from '@/lib/posts';
import { setUnreadNotifications } from '@/lib/unread-notifications';

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setItems(await fetchNotifications());
    await markAllRead();
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const rows = await fetchNotifications();
        if (active) {
          setItems(rows);
          setLoading(false);
        }
        // Clear the unread badge once they've opened the screen.
        await markAllRead();
        setUnreadNotifications(0);
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const open = (n: AppNotification) => {
    if (n.postId) {
      router.push({ pathname: '/post/[postId]', params: { postId: n.postId } });
    } else if (n.conversationId) {
      router.push({
        pathname: '/dm/[conversationId]',
        params: { conversationId: n.conversationId, otherName: n.actorName },
      });
    } else if (n.eventId) {
      router.push({
        pathname: '/event/[eventId]',
        params: { eventId: n.eventId },
      });
    }
  };

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
        <Text style={styles.title}>Notifications</Text>

        {loading ? (
          <ActivityIndicator color="#6D28D9" style={styles.loader} />
        ) : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nothing yet</Text>
            <Text style={styles.emptyText}>
              You&apos;ll hear about replies, messages, and event RSVPs here.
            </Text>
          </View>
        ) : (
          items.map((n) => (
            <Pressable
              key={n.id}
              style={[styles.row, !n.read && styles.rowUnread]}
              onPress={() => open(n)}
            >
              {n.type === 'dm' ? (
                <View>
                  <Avatar name={n.actorName} url={n.actorAvatar} size={40} />
                  {!n.read ? <View style={styles.avatarDot} /> : null}
                </View>
              ) : !n.read ? (
                <View style={styles.dot} />
              ) : (
                <View style={styles.dotSpacer} />
              )}
              <View style={styles.rowText}>
                <Text style={styles.body}>{n.body}</Text>
                {n.eventStartsAt ? (
                  <Text style={styles.eventWhen}>
                    {formatEventTime(n.eventStartsAt)}
                  </Text>
                ) : null}
                <Text style={styles.time}>{relativeTime(n.createdAt)}</Text>
              </View>
            </Pressable>
          ))
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    padding: 16,
    marginBottom: 10,
  },
  rowUnread: { backgroundColor: '#F5F0FE', borderColor: '#E1D5F7' },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: '#6D28D9',
  },
  dotSpacer: { width: 9 },
  avatarDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#6D28D9',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  rowText: { flex: 1 },
  body: { fontSize: 15, color: '#1F1438', fontWeight: '600', lineHeight: 21 },
  eventWhen: { fontSize: 13, color: '#6D28D9', fontWeight: '700', marginTop: 3 },
  time: { fontSize: 13, color: '#8A7BA3', marginTop: 4 },
});

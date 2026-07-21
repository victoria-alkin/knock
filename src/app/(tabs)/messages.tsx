import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
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
import { topBarIcons } from '@/constants/icons';
import { useScrollToTop } from '@/hooks/use-scroll-to-top';
import { ConversationSummary, fetchConversations } from '@/lib/dms';
import { getUnreadCount } from '@/lib/notifications';
import { relativeTime } from '@/lib/posts';

export default function MessagesScreen() {
  const router = useRouter();
  const scrollRef = useScrollToTop();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [unread, setUnread] = useState(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [rows, n] = await Promise.all([
      fetchConversations(),
      getUnreadCount(),
    ]);
    setConversations(rows);
    setUnread(n);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await load();
        if (active) setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.otherName.toLowerCase().includes(q) ||
        (c.lastMessage ?? '').toLowerCase().includes(q),
    );
  }, [conversations, query]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.push('/invite')} hitSlop={12}>
            <Icon source={topBarIcons.addUser} size={24} color="#6D28D9" />
          </Pressable>
          <Image
            source={require('@/assets/images/knock-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Pressable
            onPress={() => router.push('/notifications')}
            hitSlop={12}
            style={styles.bellWrap}
          >
            <Icon source={topBarIcons.notification} size={24} color="#6D28D9" />
            {unread > 0 ? <View style={styles.bellBadge} /> : null}
          </Pressable>
        </View>

        <Text style={styles.title}>Messages</Text>

        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#9B8CAF" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search messages"
            placeholderTextColor="#9B8CAF"
            style={styles.searchInput}
            returnKeyType="search"
            autoCapitalize="none"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => {
                setQuery('');
                Keyboard.dismiss();
              }}
              hitSlop={10}
            >
              <Feather name="x" size={18} color="#9B8CAF" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#6D28D9" style={styles.loader} />
      ) : conversations.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>
              Tap “Message” on a post or listing to start a conversation with a
              neighbor.
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.list}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6D28D9"
              colors={['#6D28D9']}
            />
          }
        >
          {filtered.length === 0 ? (
            <Text style={styles.noResults}>No conversations match “{query}”.</Text>
          ) : (
            filtered.map((c) => (
              <Pressable
                key={c.id}
                style={styles.row}
                onPress={() =>
                  router.push({
                    pathname: '/dm/[conversationId]',
                    params: { conversationId: c.id, otherName: c.otherName },
                  })
                }
              >
                <Avatar name={c.otherName} url={c.otherAvatar} size={52} />
                <View style={styles.rowText}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {c.otherName}
                  </Text>
                  <Text style={styles.rowPreview} numberOfLines={1}>
                    {c.lastMessage ?? 'No messages yet'}
                  </Text>
                </View>
                {c.lastAt ? (
                  <Text style={styles.rowTime}>{relativeTime(c.lastAt)}</Text>
                ) : null}
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  logo: { width: 130, height: 48 },
  bellWrap: { width: 24, height: 24 },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E23E57',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1F1438',
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F1F8',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F1438',
    padding: 0,
  },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBF9',
  },
  rowText: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '800', color: '#1F1438' },
  rowPreview: { fontSize: 14, color: '#76698C', marginTop: 3 },
  rowTime: { fontSize: 13, color: '#8A7BA3', alignSelf: 'flex-start', marginTop: 3 },
  emptyWrap: { paddingHorizontal: 20, paddingTop: 8 },
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
  noResults: {
    fontSize: 15,
    color: '#8A7BA3',
    textAlign: 'center',
    marginTop: 24,
  },
});

import { useFocusEffect, useRouter } from 'expo-router';
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

import { ConversationSummary, fetchConversations } from '@/lib/dms';

export default function MessagesScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const rows = await fetchConversations();
        if (active) {
          setConversations(rows);
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Messages</Text>

        {loading ? (
          <ActivityIndicator color="#6D28D9" style={styles.loader} />
        ) : conversations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>
              Tap “Message” on a post or listing to start a conversation with a
              neighbor.
            </Text>
          </View>
        ) : (
          <ScrollView>
            {conversations.map((c) => (
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
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {c.otherName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowName}>{c.otherName}</Text>
                  <Text style={styles.rowPreview} numberOfLines={1}>
                    {c.lastMessage ?? 'No messages yet'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F2FF' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1F1438',
    marginBottom: 22,
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
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    padding: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  rowText: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '800', color: '#1F1438', marginBottom: 3 },
  rowPreview: { fontSize: 14, color: '#76698C' },
});

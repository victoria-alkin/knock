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

import { Avatar } from '@/components/avatar';
import { BlockedUser, fetchBlockedUsers, unblockUser } from '@/lib/blocks';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const rows = await fetchBlockedUsers();
        if (active) {
          setUsers(rows);
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const handleUnblock = async (id: string) => {
    setBusyId(id);
    const { error } = await unblockUser(id);
    if (!error) setUsers((prev) => prev.filter((u) => u.id !== id));
    setBusyId(null);
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
        <Text style={styles.pageTitle}>Blocked Users</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color="#6D28D9" style={styles.loader} />
        ) : users.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No one blocked</Text>
            <Text style={styles.emptyText}>
              People you block won&apos;t see your posts or be able to message
              you, and you won&apos;t see theirs.
            </Text>
          </View>
        ) : (
          users.map((u) => (
            <View key={u.id} style={styles.row}>
              <Avatar name={u.name} url={u.avatarUrl} size={44} />
              <Text style={styles.name}>{u.name}</Text>
              <Pressable
                style={styles.unblock}
                disabled={busyId === u.id}
                onPress={() => handleUnblock(u.id)}
              >
                <Text style={styles.unblockText}>
                  {busyId === u.id ? '…' : 'Unblock'}
                </Text>
              </Pressable>
            </View>
          ))
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
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  loader: { marginTop: 40 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    alignItems: 'center',
    marginTop: 8,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBF9',
  },
  name: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1F1438' },
  unblock: {
    backgroundColor: '#F1ECFA',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  unblockText: { color: '#6D28D9', fontSize: 14, fontWeight: '800' },
});

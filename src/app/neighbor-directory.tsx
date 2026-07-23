import { Feather } from '@expo/vector-icons';
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
import { ReportDialog } from '@/components/report-dialog';
import { UserActionsSheet } from '@/components/user-actions-sheet';
import { startConversation } from '@/lib/dms';
import { getNeighborDirectory, Neighbor } from '@/lib/membership';
import { getCurrentUserId } from '@/lib/posts';

export default function NeighborDirectoryScreen() {
  const router = useRouter();
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportUser, setReportUser] = useState<Neighbor | null>(null);
  const [actionUser, setActionUser] = useState<Neighbor | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setNeighbors(await getNeighborDirectory());
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [rows, uid] = await Promise.all([
          getNeighborDirectory(),
          getCurrentUserId(),
        ]);
        if (active) {
          setNeighbors(rows);
          setCurrentUserId(uid);
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const handleMessage = async (n: Neighbor) => {
    setError(null);
    const { id, error: dmError } = await startConversation(n.id);
    if (dmError || !id) {
      setError(dmError ?? 'Could not start a conversation.');
      return;
    }
    router.push({
      pathname: '/dm/[conversationId]',
      params: { conversationId: id, otherName: n.name },
    });
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
        <Text style={styles.title}>Neighbor Directory</Text>
        <Text style={styles.subtitle}>
          Neighbors who&apos;ve opted in to the directory. Tap to message.
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator color="#6D28D9" style={styles.loader} />
        ) : neighbors.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No one listed yet</Text>
            <Text style={styles.emptyText}>
              Neighbors appear here once they join and opt in to the directory.
            </Text>
          </View>
        ) : (
          neighbors.map((n) => {
            const isMe = n.id === currentUserId;
            if (isMe) {
              return (
                <View key={n.id} style={styles.row}>
                  <Avatar name={n.name} url={n.avatarUrl} size={44} />
                  <Text style={styles.name}>{n.name}</Text>
                  <Text style={styles.youTag}>You</Text>
                </View>
              );
            }
            return (
              <Pressable
                key={n.id}
                style={styles.row}
                onPress={() => handleMessage(n)}
              >
                <Avatar name={n.name} url={n.avatarUrl} size={44} />
                <Text style={styles.name}>{n.name}</Text>
                <Pressable
                  onPress={() => setActionUser(n)}
                  hitSlop={10}
                  style={styles.flagBtn}
                >
                  <Feather name="more-horizontal" size={20} color="#B9A9D4" />
                </Pressable>
                <Feather name="message-circle" size={20} color="#6D28D9" />
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <UserActionsSheet
        visible={actionUser !== null}
        userId={actionUser?.id ?? ''}
        userName={actionUser?.name ?? 'this neighbor'}
        onClose={() => setActionUser(null)}
        onReport={() => {
          setReportUser(actionUser);
          setActionUser(null);
        }}
        onBlocked={() => {
          setActionUser(null);
          getNeighborDirectory().then(setNeighbors);
        }}
      />

      <ReportDialog
        visible={reportUser !== null}
        targetType="user"
        targetId={reportUser?.id ?? ''}
        targetLabel="neighbor"
        onClose={() => setReportUser(null)}
      />
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
    marginBottom: 6,
  },
  subtitle: { fontSize: 15, color: '#67597F', marginBottom: 22, lineHeight: 21 },
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBF9',
  },
  name: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1F1438' },
  flagBtn: { padding: 4 },
  youTag: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6D28D9',
    backgroundColor: '#F1ECFA',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  errorText: {
    fontSize: 14,
    color: '#B4243F',
    marginBottom: 12,
  },
});

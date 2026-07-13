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

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icon';
import { CHANNELS } from '@/constants/channels';
import { likeIcons } from '@/constants/icons';
import { fetchMyPosts, Post, relativeTime, URGENCY_META } from '@/lib/posts';

function channelLabel(key: string): string {
  return CHANNELS.find((c) => c.key === key)?.name ?? key;
}

export default function MyPostsScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => setPosts(await fetchMyPosts()), []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const rows = await fetchMyPosts();
        if (active) {
          setPosts(rows);
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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6D28D9"
            colors={['#6D28D9']}
          />
        }
      >
        <Text style={styles.title}>My Posts</Text>

        {loading ? (
          <ActivityIndicator color="#6D28D9" style={styles.loader} />
        ) : posts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>
              Posts you share in your building will show up here.
            </Text>
          </View>
        ) : (
          posts.map((post) => {
            const urgency =
              post.urgency !== 'normal' ? URGENCY_META[post.urgency] : null;
            return (
              <Pressable
                key={post.id}
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: '/post/[postId]',
                    params: { postId: post.id },
                  })
                }
              >
                <View style={styles.cardHead}>
                  <Avatar
                    name={post.authorName}
                    url={post.authorAvatar}
                    size={38}
                  />
                  <View style={styles.cardHeadText}>
                    <Text style={styles.author}>{post.authorName}</Text>
                    <Text style={styles.meta}>
                      {channelLabel(post.channel)} · {relativeTime(post.createdAt)}
                    </Text>
                  </View>
                  {urgency ? (
                    <View
                      style={[styles.urgency, { backgroundColor: urgency.bg }]}
                    >
                      <Text style={[styles.urgencyText, { color: urgency.color }]}>
                        {urgency.label}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.body}>{post.body}</Text>

                {post.imageUrl ? (
                  <Image source={{ uri: post.imageUrl }} style={styles.image} />
                ) : null}

                <View style={styles.footer}>
                  <View style={styles.stat}>
                    <Icon
                      source={post.likedByMe ? likeIcons.filled : likeIcons.outline}
                      size={17}
                      color={post.likedByMe ? '#E23E57' : '#8A7BA3'}
                    />
                    <Text style={styles.statText}>{post.likeCount}</Text>
                  </View>
                  <Text style={styles.statText}>
                    {post.replyCount === 0
                      ? 'Reply'
                      : `${post.replyCount} ${
                          post.replyCount === 1 ? 'reply' : 'replies'
                        }`}
                  </Text>
                </View>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    marginBottom: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardHeadText: { flex: 1 },
  author: { fontSize: 15, fontWeight: '800', color: '#1F1438' },
  meta: { fontSize: 13, color: '#8A7BA3', marginTop: 1 },
  urgency: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  urgencyText: { fontSize: 12, fontWeight: '800' },
  body: {
    fontSize: 15,
    color: '#2D2145',
    lineHeight: 22,
    marginTop: 12,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 14,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 14, color: '#8A7BA3', fontWeight: '700' },
});

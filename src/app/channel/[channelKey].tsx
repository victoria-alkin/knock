import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
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

import { Avatar } from '@/components/avatar';
import { CHANNELS } from '@/constants/channels';
import { getMyBuilding } from '@/lib/membership';
import {
  fetchBuildingPosts,
  Post,
  relativeTime,
  setPostLike,
} from '@/lib/posts';

export default function ChannelDetailScreen() {
  const router = useRouter();
  const { channelKey } = useLocalSearchParams<{ channelKey: string }>();
  const channel = CHANNELS.find((c) => c.key === channelKey);

  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const building = await getMyBuilding();
      if (active) {
        setBuildingId(building?.id ?? null);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!buildingId || !channelKey) return;
        const rows = await fetchBuildingPosts(buildingId, channelKey);
        if (active) setPosts(rows);
      })();
      return () => {
        active = false;
      };
    }, [buildingId, channelKey]),
  );

  const toggleLike = async (post: Post) => {
    const nextLiked = !post.likedByMe;
    const delta = nextLiked ? 1 : -1;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likedByMe: nextLiked, likeCount: p.likeCount + delta }
          : p,
      ),
    );
    const { error } = await setPostLike(post.id, nextLiked);
    if (error) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, likedByMe: !nextLiked, likeCount: p.likeCount - delta }
            : p,
        ),
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.emoji}>{channel?.emoji ?? '💬'}</Text>
          <Text style={styles.title}>{channel?.name ?? 'Channel'}</Text>
        </View>
        {channel?.description ? (
          <Text style={styles.description}>{channel.description}</Text>
        ) : null}

        <Pressable
          style={styles.newPostButton}
          onPress={() =>
            router.push({
              pathname: '/create-post',
              params: { channel: channelKey },
            })
          }
        >
          <Text style={styles.newPostText}>+ New post in {channel?.name ?? 'this channel'}</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator color="#6D28D9" style={styles.loader} />
        ) : posts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyText}>
              Be the first to post in {channel?.name ?? 'this channel'}.
            </Text>
          </View>
        ) : (
          posts.map((post) => (
            <Pressable
              key={post.id}
              style={styles.postCard}
              onPress={() =>
                router.push({
                  pathname: '/post/[postId]',
                  params: { postId: post.id },
                })
              }
            >
              <View style={styles.postHeader}>
                <Avatar name={post.authorName} url={post.authorAvatar} size={38} />
                <View style={styles.postMeta}>
                  <Text style={styles.postAuthor}>{post.authorName}</Text>
                  <Text style={styles.postTime}>
                    {relativeTime(post.createdAt)}
                  </Text>
                </View>
              </View>
              <Text style={styles.postBody}>{post.body}</Text>
              <View style={styles.postFooter}>
                <Pressable
                  style={styles.footerAction}
                  onPress={() => toggleLike(post)}
                >
                  <Text style={styles.heart}>
                    {post.likedByMe ? '❤️' : '🤍'}
                  </Text>
                  <Text style={styles.footerCount}>{post.likeCount}</Text>
                </Pressable>
                <Text style={styles.footerReplies}>
                  {post.replyCount === 0
                    ? 'Reply'
                    : `${post.replyCount} ${post.replyCount === 1 ? 'reply' : 'replies'}`}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F2FF',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  back: {
    fontSize: 16,
    color: '#6D28D9',
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  emoji: {
    fontSize: 28,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1F1438',
  },
  description: {
    fontSize: 15,
    color: '#67597F',
    lineHeight: 22,
    marginBottom: 20,
  },
  newPostButton: {
    backgroundColor: '#6D28D9',
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 22,
  },
  newPostText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  loader: {
    marginTop: 40,
  },
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
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  postMeta: {
    flex: 1,
  },
  postAuthor: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F1438',
  },
  postTime: {
    fontSize: 13,
    color: '#8A7BA3',
  },
  postBody: {
    fontSize: 15,
    color: '#2C2340',
    lineHeight: 22,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 14,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heart: {
    fontSize: 16,
  },
  footerCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A3D63',
  },
  footerReplies: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6D28D9',
  },
});

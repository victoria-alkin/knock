import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { CHANNELS } from '@/constants/channels';
import { getMyBuilding, MyBuilding } from '@/lib/membership';
import {
  fetchBuildingPosts,
  Post,
  relativeTime,
  setPostLike,
} from '@/lib/posts';

const CHANNEL_BY_KEY = Object.fromEntries(CHANNELS.map((c) => [c.key, c]));

export default function HomeScreen() {
  const router = useRouter();
  const [building, setBuilding] = useState<MyBuilding | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await getMyBuilding();
      if (active) {
        setBuilding(result);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Refresh the feed whenever the screen regains focus (e.g. after posting).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!building) return;
        const rows = await fetchBuildingPosts(building.id);
        if (active) setPosts(rows);
      })();
      return () => {
        active = false;
      };
    }, [building]),
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#6D28D9" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image
          source={require('@/assets/images/knock-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.buildingCard}>
          <Text style={styles.buildingName}>
            {building?.name ?? 'Your building'}
          </Text>
          {building?.address ? (
            <Text style={styles.buildingAddress}>{building.address}</Text>
          ) : null}
          <View
            style={[
              styles.badge,
              building?.verified ? styles.badgeVerified : styles.badgePending,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                building?.verified
                  ? styles.badgeTextVerified
                  : styles.badgeTextPending,
              ]}
            >
              {building?.verified ? '✓ Verified building' : 'Pending verification'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Channels</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.channelRow}
        >
          {CHANNELS.map((channel) => (
            <Pressable
              key={channel.key}
              style={styles.channelChip}
              onPress={() =>
                channel.key === 'events'
                  ? router.push('/events')
                  : channel.key === 'marketplace'
                    ? router.push('/marketplace')
                    : router.push({
                        pathname: '/channel/[channelKey]',
                        params: { channelKey: channel.key },
                      })
              }
            >
              <View
                style={[styles.channelIcon, { backgroundColor: channel.color }]}
              >
                <Text style={styles.channelEmoji}>{channel.emoji}</Text>
              </View>
              <Text style={styles.channelName}>{channel.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.feedHeader}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <Pressable
            style={styles.newPostButton}
            onPress={() => router.push('/create-post')}
          >
            <Text style={styles.newPostText}>+ New post</Text>
          </Pressable>
        </View>

        {posts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyText}>
              Be the first to post in {building?.name ?? 'your building'}. Say
              hi, ask for help, or start an event.
            </Text>
          </View>
        ) : (
          posts.map((post) => {
            const channel = CHANNEL_BY_KEY[post.channel];
            return (
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
                  <Avatar
                    name={post.authorName}
                    url={post.authorAvatar}
                    size={38}
                  />
                  <View style={styles.postMeta}>
                    <Text style={styles.postAuthor}>{post.authorName}</Text>
                    <Text style={styles.postChannel}>
                      {channel
                        ? `${channel.emoji} ${channel.name}`
                        : post.channel}
                      {' · '}
                      {relativeTime(post.createdAt)}
                    </Text>
                  </View>
                </View>
                {post.body ? (
                  <Text style={styles.postBody}>{post.body}</Text>
                ) : null}
                {post.imageUrl ? (
                  <Image
                    source={{ uri: post.imageUrl }}
                    style={styles.postImage}
                  />
                ) : null}
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
            );
          })
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
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  logo: {
    width: 130,
    height: 48,
    alignSelf: 'center',
    marginBottom: 18,
  },
  buildingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    marginBottom: 24,
  },
  buildingName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 4,
  },
  buildingAddress: {
    fontSize: 15,
    color: '#76698C',
    marginBottom: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  badgeVerified: {
    backgroundColor: '#E4F6EA',
  },
  badgePending: {
    backgroundColor: '#F1ECFA',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  badgeTextVerified: {
    color: '#1B873F',
  },
  badgeTextPending: {
    color: '#6D28D9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 12,
  },
  channelRow: {
    gap: 12,
    paddingBottom: 24,
    paddingRight: 8,
  },
  channelChip: {
    width: 68,
    alignItems: 'center',
    gap: 8,
  },
  channelIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelEmoji: {
    fontSize: 26,
  },
  channelName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A3D63',
    textAlign: 'center',
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  newPostButton: {
    backgroundColor: '#6D28D9',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  newPostText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
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
  postChannel: {
    fontSize: 13,
    color: '#8A7BA3',
    marginTop: 2,
  },
  postBody: {
    fontSize: 15,
    color: '#2C2340',
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 12,
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

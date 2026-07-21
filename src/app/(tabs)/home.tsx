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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { UrgencyBadge } from '@/components/urgency-badge';
import { CHANNELS } from '@/constants/channels';
import { channelIcons, likeIcons, topBarIcons } from '@/constants/icons';
import { EventSummary, fetchEvents, formatEventTime } from '@/lib/events';
import { getMyBuilding, MyBuilding } from '@/lib/membership';
import { useScrollToTop } from '@/hooks/use-scroll-to-top';
import { getUnreadCount } from '@/lib/notifications';
import {
  fetchBuildingPosts,
  Post,
  relativeTime,
  setPostLike,
} from '@/lib/posts';

const CHANNEL_BY_KEY = Object.fromEntries(CHANNELS.map((c) => [c.key, c]));

export default function HomeScreen() {
  const router = useRouter();
  const scrollRef = useScrollToTop();
  const [building, setBuilding] = useState<MyBuilding | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const b = (await getMyBuilding()) ?? building;
    setBuilding(b);
    if (b) {
      const [rows, n, ev] = await Promise.all([
        fetchBuildingPosts(b.id),
        getUnreadCount(),
        fetchEvents(b.id),
      ]);
      setPosts(rows);
      setUnread(n);
      setEvents(ev);
    }
    setRefreshing(false);
  }, [building]);

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

  // Refresh the unread badge whenever the screen regains focus.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getUnreadCount().then((n) => {
        if (active) setUnread(n);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  // Refresh the feed whenever the screen regains focus (e.g. after posting).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!building) return;
        const [rows, ev] = await Promise.all([
          fetchBuildingPosts(building.id),
          fetchEvents(building.id),
        ]);
        if (active) {
          setPosts(rows);
          setEvents(ev);
        }
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

  const renderPost = (post: Post) => {
    const channel = CHANNEL_BY_KEY[post.channel];
    return (
      <PressableScale
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
            <Text style={styles.postChannel}>
              {channel ? `${channel.emoji} ${channel.name}` : post.channel}
              {' · '}
              {relativeTime(post.createdAt)}
            </Text>
          </View>
          <UrgencyBadge urgency={post.urgency} />
        </View>
        {post.body ? <Text style={styles.postBody}>{post.body}</Text> : null}
        {post.imageUrl ? (
          <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
        ) : null}
        <View style={styles.postFooter}>
          <Pressable style={styles.footerAction} onPress={() => toggleLike(post)}>
            <Icon
              source={post.likedByMe ? likeIcons.filled : likeIcons.outline}
              size={17}
              color={post.likedByMe ? '#E23E57' : '#8A7BA3'}
            />
            <Text style={styles.footerCount}>{post.likeCount}</Text>
          </Pressable>
          <Text style={styles.footerReplies}>
            {post.replyCount === 0
              ? 'Reply'
              : `${post.replyCount} ${post.replyCount === 1 ? 'reply' : 'replies'}`}
          </Text>
        </View>
      </PressableScale>
    );
  };

  const pinned = posts.filter((p) => p.pinned);
  const help = posts.filter((p) => p.channel === 'help').slice(0, 3);
  const recent = posts.filter((p) => !p.pinned);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#6D28D9" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        ref={scrollRef}
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
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.push('/invite')}
            hitSlop={12}
            accessibilityLabel="Invite neighbors"
          >
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
            accessibilityLabel="Notifications"
          >
            <Icon source={topBarIcons.notification} size={24} color="#6D28D9" />
            {unread > 0 ? <View style={styles.bellBadge} /> : null}
          </Pressable>
        </View>

        <View style={styles.buildingHeader}>
          <View style={styles.buildingHeaderLeft}>
            <Text style={styles.buildingName} numberOfLines={1}>
              {building?.name ?? 'Your building'}
            </Text>
            {building?.address ? (
              <Text style={styles.buildingAddress}>{building.address}</Text>
            ) : null}
          </View>
          <View
            style={[
              styles.verifiedPill,
              building?.verified
                ? styles.verifiedPillOn
                : styles.verifiedPillPending,
            ]}
          >
            <Feather
              name="shield"
              size={13}
              color={building?.verified ? '#6D28D9' : '#9A6A15'}
            />
            <Text
              style={[
                styles.verifiedText,
                building?.verified
                  ? styles.verifiedTextOn
                  : styles.verifiedTextPending,
              ]}
            >
              {building?.verified ? 'Verified building' : 'Pending'}
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
            <PressableScale
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
                {channelIcons[channel.key] ? (
                  <Icon
                    source={channelIcons[channel.key]}
                    size={28}
                    color={channel.accent}
                  />
                ) : (
                  <Text style={styles.channelEmoji}>{channel.emoji}</Text>
                )}
              </View>
              <Text style={styles.channelName}>{channel.name}</Text>
            </PressableScale>
          ))}
        </ScrollView>

        {events.length > 0 ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Upcoming events</Text>
              <Pressable onPress={() => router.push('/events')}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.eventsScroll}
              contentContainerStyle={styles.eventsRow}
            >
              {events.slice(0, 10).map((event) => (
                <PressableScale
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() =>
                    router.push({
                      pathname: '/event/[eventId]',
                      params: { eventId: event.id },
                    })
                  }
                >
                  {event.imageUrl ? (
                    <Image
                      source={{ uri: event.imageUrl }}
                      style={styles.eventImage}
                    />
                  ) : null}
                  <Text style={styles.eventTime}>
                    {formatEventTime(event.startsAt)}
                  </Text>
                  <Text style={styles.eventTitle} numberOfLines={2}>
                    {event.title}
                  </Text>
                  {event.location ? (
                    <Text style={styles.eventLocation} numberOfLines={1}>
                      📍 {event.location}
                    </Text>
                  ) : null}
                  <View style={styles.eventFooter}>
                    <Text style={styles.eventGoing}>
                      {event.goingCount} going
                    </Text>
                    {event.myStatus === 'going' ? (
                      <Text style={styles.eventYouBadge}>You&apos;re going</Text>
                    ) : null}
                  </View>
                </PressableScale>
              ))}
            </ScrollView>
          </>
        ) : null}

        {pinned.length > 0 ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Pinned</Text>
            </View>
            {pinned.map(renderPost)}
          </>
        ) : null}

        {help.length > 0 ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Help requests</Text>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/channel/[channelKey]',
                    params: { channelKey: 'help' },
                  })
                }
              >
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {help.map(renderPost)}
          </>
        ) : null}

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
            <Text style={styles.emptyTitle}>You&apos;re one of the first here</Text>
            <Text style={styles.emptyText}>
              Be the first to post in {building?.name ?? 'your building'}, or
              invite your neighbors to join.
            </Text>
            <Pressable
              style={styles.inviteButton}
              onPress={() => router.push('/invite')}
            >
              <Text style={styles.inviteButtonText}>Invite neighbors</Text>
            </Pressable>
          </View>
        ) : (
          recent.map(renderPost)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topBarSpacer: { width: 24 },
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
  logo: {
    width: 130,
    height: 48,
  },
  buildingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  buildingHeaderLeft: { flex: 1 },
  buildingName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1F1438',
    flexShrink: 1,
  },
  buildingAddress: {
    fontSize: 15,
    color: '#76698C',
    marginTop: 3,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  verifiedPillOn: { backgroundColor: '#EDE7FB' },
  verifiedPillPending: { backgroundColor: '#FBF3DA' },
  verifiedText: { fontSize: 13, fontWeight: '800' },
  verifiedTextOn: { color: '#6D28D9' },
  verifiedTextPending: { color: '#9A6A15' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 8,
  },
  channelRow: {
    gap: 12,
    paddingBottom: 8,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6D28D9',
    marginBottom: 8,
  },
  eventsScroll: { marginBottom: 8 },
  eventsRow: { gap: 12, paddingRight: 8 },
  eventCard: {
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E7DFF5',
  },
  eventImage: {
    width: '100%',
    height: 130,
    borderRadius: 12,
    marginBottom: 12,
  },
  eventTime: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6D28D9',
    marginBottom: 6,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 6,
  },
  eventLocation: { fontSize: 14, color: '#76698C', marginBottom: 10 },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventGoing: { fontSize: 14, color: '#4A3D63', fontWeight: '700' },
  eventYouBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1B873F',
    backgroundColor: '#E4F6EA',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  newPostButton: {
    backgroundColor: '#6D28D9',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 8,
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
  inviteButton: {
    backgroundColor: '#6D28D9',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 22,
    marginTop: 16,
  },
  inviteButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
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

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CHANNELS } from '@/constants/channels';
import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icon';
import { UrgencyBadge } from '@/components/urgency-badge';
import { likeIcons } from '@/constants/icons';
import { startConversation } from '@/lib/dms';
import {
  createReply,
  deletePost,
  deleteReply,
  fetchPost,
  fetchReplies,
  getCurrentUserId,
  Post,
  relativeTime,
  Reply,
  setPostLike,
  setPostPinned,
  setReplyLike,
} from '@/lib/posts';

const CHANNEL_BY_KEY = Object.fromEntries(CHANNELS.map((c) => [c.key, c]));

export default function PostDetailScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId: string }>();

  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingPostDelete, setConfirmingPostDelete] = useState(false);
  const [confirmingReplyId, setConfirmingReplyId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    if (!postId) return;
    const [p, r, uid] = await Promise.all([
      fetchPost(postId),
      fetchReplies(postId),
      getCurrentUserId(),
    ]);
    setPost(p);
    setReplies(r);
    setCurrentUserId(uid);
    setLoading(false);
  }, [postId]);

  const handleDeletePost = async () => {
    if (!postId) return;
    const { error: deleteError } = await deletePost(postId);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    router.back();
  };

  const handleDeleteReply = async (replyId: string) => {
    const { error: deleteError } = await deleteReply(replyId);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    setConfirmingReplyId(null);
    await load();
  };

  const handleToggleLike = async () => {
    if (!post) return;
    const nextLiked = !post.likedByMe;
    const delta = nextLiked ? 1 : -1;
    setPost({ ...post, likedByMe: nextLiked, likeCount: post.likeCount + delta });
    const { error: likeError } = await setPostLike(post.id, nextLiked);
    if (likeError) {
      setPost((p) =>
        p
          ? { ...p, likedByMe: !nextLiked, likeCount: p.likeCount - delta }
          : p,
      );
    }
  };

  const handleToggleReplyLike = async (replyId: string) => {
    const target = replies.find((r) => r.id === replyId);
    if (!target) return;
    const nextLiked = !target.likedByMe;
    const delta = nextLiked ? 1 : -1;
    setReplies((prev) =>
      prev.map((r) =>
        r.id === replyId
          ? { ...r, likedByMe: nextLiked, likeCount: r.likeCount + delta }
          : r,
      ),
    );
    const { error: likeError } = await setReplyLike(replyId, nextLiked);
    if (likeError) {
      setReplies((prev) =>
        prev.map((r) =>
          r.id === replyId
            ? { ...r, likedByMe: !nextLiked, likeCount: r.likeCount - delta }
            : r,
        ),
      );
    }
  };

  const handleTogglePin = async () => {
    if (!post) return;
    const next = !post.pinned;
    setPost({ ...post, pinned: next });
    const { error: pinError } = await setPostPinned(post.id, next);
    if (pinError) {
      setPost((p) => (p ? { ...p, pinned: !next } : p));
    }
  };

  const handleMessageAuthor = async () => {
    if (!post) return;
    const { id, error: dmError } = await startConversation(post.authorId);
    if (dmError || !id) {
      setError(dmError ?? 'Could not start a conversation.');
      return;
    }
    router.push({
      pathname: '/dm/[conversationId]',
      params: { conversationId: id, otherName: post.authorName },
    });
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (active) await load();
      })();
      return () => {
        active = false;
      };
    }, [load]),
  );

  const handleSend = async () => {
    if (!postId || body.trim().length === 0) return;
    setSending(true);
    setError(null);
    const { error: replyError } = await createReply(
      postId,
      body,
      replyingTo?.id ?? null,
    );
    if (replyError) {
      setError(replyError);
      setSending(false);
      return;
    }
    setBody('');
    setReplyingTo(null);
    setSending(false);
    await load();
  };

  const channel = post ? CHANNEL_BY_KEY[post.channel] : undefined;

  // Group replies into threads: top-level comments and their nested replies.
  const childrenByParent = new Map<string, Reply[]>();
  for (const r of replies) {
    if (r.parentReplyId) {
      const arr = childrenByParent.get(r.parentReplyId) ?? [];
      arr.push(r);
      childrenByParent.set(r.parentReplyId, arr);
    }
  }
  const topLevelReplies = replies.filter((r) => !r.parentReplyId);

  const renderReply = (reply: Reply, depth: number) => {
    const children = childrenByParent.get(reply.id) ?? [];
    const mine = reply.authorId === currentUserId;
    return (
      <View key={reply.id}>
        <View style={[styles.replyCard, depth > 0 && styles.replyNested]}>
          <View style={styles.replyMeta}>
            <View style={styles.replyAuthorRow}>
              <Avatar
                name={reply.authorName}
                url={reply.authorAvatar}
                size={28}
              />
              <Text style={styles.replyAuthor}>{reply.authorName}</Text>
            </View>
            <Text style={styles.replyTime}>{relativeTime(reply.createdAt)}</Text>
          </View>
          <Text style={styles.replyBody}>{reply.body}</Text>

          {confirmingReplyId === reply.id ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmText}>Delete?</Text>
              <Pressable onPress={() => handleDeleteReply(reply.id)}>
                <Text style={styles.confirmYes}>Delete</Text>
              </Pressable>
              <Pressable onPress={() => setConfirmingReplyId(null)}>
                <Text style={styles.confirmCancel}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.replyActions}>
              <Pressable
                style={styles.replyLike}
                onPress={() => handleToggleReplyLike(reply.id)}
                hitSlop={8}
              >
                <Icon
                  source={reply.likedByMe ? likeIcons.filled : likeIcons.outline}
                  size={15}
                  color={reply.likedByMe ? '#E23E57' : '#8A7BA3'}
                />
                {reply.likeCount > 0 ? (
                  <Text style={styles.replyLikeCount}>{reply.likeCount}</Text>
                ) : null}
              </Pressable>
              {post?.allowReplies ? (
                <Pressable
                  onPress={() =>
                    setReplyingTo({ id: reply.id, name: reply.authorName })
                  }
                >
                  <Text style={styles.replyLink}>Reply</Text>
                </Pressable>
              ) : null}
              {mine ? (
                <Pressable onPress={() => setConfirmingReplyId(reply.id)}>
                  <Text style={styles.replyDelete}>Delete</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
        {children.map((child) => renderReply(child, depth + 1))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <ActivityIndicator color="#6D28D9" style={styles.loader} />
        ) : !post ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>This post is no longer available.</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.postCard}>
              <View style={styles.postHeader}>
                <Avatar name={post.authorName} url={post.authorAvatar} size={42} />
                <View style={styles.postHeaderText}>
                  <Text style={styles.postAuthor}>{post.authorName}</Text>
                  <Text style={styles.postChannel}>
                    {channel ? `${channel.emoji} ${channel.name}` : post.channel}
                    {' · '}
                    {relativeTime(post.createdAt)}
                  </Text>
                </View>
                <UrgencyBadge urgency={post.urgency} />
              </View>
              {post.body ? (
                <Text style={styles.postBody}>{post.body}</Text>
              ) : null}
              {post.imageUrl ? (
                <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
              ) : null}

              <Pressable style={styles.likeRow} onPress={handleToggleLike}>
                <Icon
                  source={post.likedByMe ? likeIcons.filled : likeIcons.outline}
                  size={20}
                  color={post.likedByMe ? '#E23E57' : '#8A7BA3'}
                />
                <Text style={styles.likeCount}>
                  {post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}
                </Text>
              </Pressable>

              {post.authorId === currentUserId ? (
                confirmingPostDelete ? (
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmText}>Delete this post?</Text>
                    <Pressable onPress={handleDeletePost}>
                      <Text style={styles.confirmYes}>Delete</Text>
                    </Pressable>
                    <Pressable onPress={() => setConfirmingPostDelete(false)}>
                      <Text style={styles.confirmCancel}>Cancel</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.ownerRow}>
                    <Pressable onPress={handleTogglePin}>
                      <Text style={styles.pinLink}>
                        {post.pinned ? 'Unpin' : 'Pin to top'}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => setConfirmingPostDelete(true)}>
                      <Text style={styles.deleteLink}>Delete post</Text>
                    </Pressable>
                  </View>
                )
              ) : post.allowDms && !post.isAnonymous ? (
                <Pressable
                  style={styles.messageButton}
                  onPress={handleMessageAuthor}
                >
                  <Text style={styles.messageButtonText}>
                    Message {post.authorName}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.repliesTitle}>
              {replies.length === 0
                ? 'No replies yet'
                : `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
            </Text>

            {topLevelReplies.map((reply) => renderReply(reply, 0))}
          </ScrollView>
        )}

        {post && post.allowReplies ? (
          <View style={styles.composer}>
            {error && <Text style={styles.errorText}>{error}</Text>}
            {replyingTo ? (
              <View style={styles.replyingBanner}>
                <Text style={styles.replyingText}>
                  Replying to {replyingTo.name}
                </Text>
                <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
                  <Text style={styles.replyingCancel}>✕</Text>
                </Pressable>
              </View>
            ) : null}
            <View style={styles.composerRow}>
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder={
                  replyingTo ? `Reply to ${replyingTo.name}…` : 'Write a reply…'
                }
                placeholderTextColor="#9B8CAF"
                style={styles.input}
                multiline
                maxLength={4000}
              />
              <Pressable
                style={[
                  styles.sendButton,
                  (body.trim().length === 0 || sending) &&
                    styles.sendButtonDisabled,
                ]}
                disabled={body.trim().length === 0 || sending}
                onPress={handleSend}
              >
                <Text style={styles.sendButtonText}>
                  {sending ? '…' : 'Reply'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : post ? (
          <View style={styles.repliesOff}>
            <Text style={styles.repliesOffText}>
              Replies are turned off for this post.
            </Text>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  loader: {
    marginTop: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    marginBottom: 22,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  postHeaderText: {
    flex: 1,
  },
  postAuthor: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F1438',
  },
  postChannel: {
    fontSize: 13,
    color: '#8A7BA3',
    marginTop: 2,
  },
  postBody: {
    fontSize: 16,
    color: '#2C2340',
    lineHeight: 23,
  },
  postImage: {
    width: '100%',
    height: 240,
    borderRadius: 14,
    marginTop: 14,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  heart: {
    fontSize: 18,
  },
  likeCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A3D63',
  },
  repliesTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4A3D63',
    marginBottom: 12,
  },
  replyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    marginBottom: 10,
  },
  replyNested: { marginLeft: 24 },
  replyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 10,
  },
  replyLink: { fontSize: 13, fontWeight: '700', color: '#6D28D9' },
  replyDelete: { fontSize: 13, fontWeight: '700', color: '#B4243F' },
  replyLike: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  replyLikeCount: { fontSize: 13, fontWeight: '700', color: '#8A7BA3' },
  replyingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F1F8',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  replyingText: { fontSize: 13, fontWeight: '700', color: '#4A3D63' },
  replyingCancel: { fontSize: 14, fontWeight: '800', color: '#8A7BA3' },
  replyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  replyAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  replyAuthor: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F1438',
  },
  replyTime: {
    fontSize: 12,
    color: '#8A7BA3',
  },
  replyBody: {
    fontSize: 15,
    color: '#2C2340',
    lineHeight: 21,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  pinLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6D28D9',
    marginTop: 12,
  },
  deleteLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B4243F',
    marginTop: 12,
  },
  messageButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1ECFA',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  messageButtonText: {
    color: '#6D28D9',
    fontSize: 14,
    fontWeight: '800',
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
  },
  confirmText: {
    fontSize: 13,
    color: '#67597F',
    marginRight: 'auto',
  },
  confirmYes: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B4243F',
  },
  confirmCancel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6D28D9',
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: '#E7DFF5',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#FDFCFF',
  },
  repliesOff: {
    borderTopWidth: 1,
    borderTopColor: '#E7DFF5',
    padding: 16,
    backgroundColor: '#FDFCFF',
  },
  repliesOffText: {
    fontSize: 14,
    color: '#76698C',
    textAlign: 'center',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F1438',
    borderWidth: 1,
    borderColor: '#E5DDF5',
    maxHeight: 120,
  },
  sendButton: {
    backgroundColor: '#6D28D9',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  errorText: {
    fontSize: 14,
    color: '#B4243F',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#76698C',
  },
});

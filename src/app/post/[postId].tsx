import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
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
    const { error: replyError } = await createReply(postId, body);
    if (replyError) {
      setError(replyError);
      setSending(false);
      return;
    }
    setBody('');
    setSending(false);
    await load();
  };

  const channel = post ? CHANNEL_BY_KEY[post.channel] : undefined;

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
          <ScrollView contentContainerStyle={styles.content}>
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
              </View>
              <Text style={styles.postBody}>{post.body}</Text>

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
                  <Pressable onPress={() => setConfirmingPostDelete(true)}>
                    <Text style={styles.deleteLink}>Delete post</Text>
                  </Pressable>
                )
              ) : (
                <Pressable
                  style={styles.messageButton}
                  onPress={handleMessageAuthor}
                >
                  <Text style={styles.messageButtonText}>
                    Message {post.authorName}
                  </Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.repliesTitle}>
              {replies.length === 0
                ? 'No replies yet'
                : `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
            </Text>

            {replies.map((reply) => (
              <View key={reply.id} style={styles.replyCard}>
                <View style={styles.replyMeta}>
                  <View style={styles.replyAuthorRow}>
                    <Avatar
                      name={reply.authorName}
                      url={reply.authorAvatar}
                      size={28}
                    />
                    <Text style={styles.replyAuthor}>{reply.authorName}</Text>
                  </View>
                  <Text style={styles.replyTime}>
                    {relativeTime(reply.createdAt)}
                  </Text>
                </View>
                <Text style={styles.replyBody}>{reply.body}</Text>

                {reply.authorId === currentUserId &&
                  (confirmingReplyId === reply.id ? (
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
                    <Pressable onPress={() => setConfirmingReplyId(reply.id)}>
                      <Text style={styles.deleteLink}>Delete</Text>
                    </Pressable>
                  ))}
              </View>
            ))}
          </ScrollView>
        )}

        {post && (
          <View style={styles.composer}>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <View style={styles.composerRow}>
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="Write a reply…"
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
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F2FF',
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

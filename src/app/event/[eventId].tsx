import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useCallback, useState } from 'react';
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

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icon';
import { rsvpIcons } from '@/constants/icons';
import {
  createEventComment,
  deleteEventComment,
  EventComment,
  EventDetail,
  fetchEvent,
  fetchEventComments,
  formatEventTime,
  RsvpStatus,
  setRsvp,
} from '@/lib/events';
import { getCurrentUserId, relativeTime } from '@/lib/posts';

const OPTIONS: { status: RsvpStatus; label: string }[] = [
  { status: 'going', label: 'Going' },
  { status: 'maybe', label: 'Maybe' },
  { status: 'not_going', label: 'Not going' },
];

export default function EventDetailScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmingCommentId, setConfirmingCommentId] = useState<string | null>(
    null,
  );

  const load = useCallback(async () => {
    if (!eventId) return;
    const [detail, eventComments, uid] = await Promise.all([
      fetchEvent(eventId),
      fetchEventComments(eventId),
      getCurrentUserId(),
    ]);
    setEvent(detail);
    setComments(eventComments);
    setCurrentUserId(uid);
    setLoading(false);
  }, [eventId]);

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

  const handleRsvp = async (status: RsvpStatus) => {
    if (!eventId) return;
    setUpdating(true);
    await setRsvp(eventId, status);
    await load();
    setUpdating(false);
  };

  const handleSendComment = async () => {
    if (!eventId || commentBody.trim().length === 0) return;
    setSending(true);
    await createEventComment(eventId, commentBody);
    setCommentBody('');
    await load();
    setSending(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteEventComment(commentId);
    setConfirmingCommentId(null);
    await load();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#6D28D9" />
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>This event is no longer available.</Text>
      </SafeAreaView>
    );
  }

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
        <ScrollView contentContainerStyle={styles.content}>
          {event.imageUrl ? (
            <Image source={{ uri: event.imageUrl }} style={styles.cover} />
          ) : null}
          <Text style={styles.time}>{formatEventTime(event.startsAt)}</Text>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.host}>Hosted by {event.hostName}</Text>

          {event.location ? (
            <Text style={styles.location}>📍 {event.location}</Text>
          ) : null}
          {event.description ? (
            <Text style={styles.description}>{event.description}</Text>
          ) : null}

          <Text style={styles.counts}>
            {event.goingCount} going · {event.maybeCount} maybe ·{' '}
            {event.notGoingCount} not going
          </Text>

          <Text style={styles.sectionLabel}>Your response</Text>
          <View style={styles.rsvpRow}>
            {OPTIONS.map((option) => {
              const selected = event.myStatus === option.status;
              return (
                <Pressable
                  key={option.status}
                  style={[styles.rsvpButton, selected && styles.rsvpButtonOn]}
                  disabled={updating}
                  onPress={() => handleRsvp(option.status)}
                >
                  <Icon
                    source={rsvpIcons[option.status]}
                    size={22}
                    color={selected ? '#FFFFFF' : '#6D28D9'}
                  />
                  <Text
                    style={[styles.rsvpText, selected && styles.rsvpTextOn]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {event.going.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>Going</Text>
              {event.going.map((attendee, i) => (
                <View key={`${attendee.name}-${i}`} style={styles.attendeeRow}>
                  <Avatar name={attendee.name} url={attendee.avatar} size={36} />
                  <Text style={styles.attendeeName}>{attendee.name}</Text>
                </View>
              ))}
            </>
          ) : null}

          <Text style={styles.sectionLabel}>
            {comments.length === 0
              ? 'Comments'
              : `Comments (${comments.length})`}
          </Text>
          {comments.length === 0 ? (
            <Text style={styles.noComments}>
              No comments yet — ask a question or say you&apos;re in.
            </Text>
          ) : (
            comments.map((comment) => (
              <View key={comment.id} style={styles.commentCard}>
                <View style={styles.commentHead}>
                  <View style={styles.commentAuthorRow}>
                    <Avatar
                      name={comment.authorName}
                      url={comment.authorAvatar}
                      size={28}
                    />
                    <Text style={styles.commentAuthor}>
                      {comment.authorName}
                    </Text>
                  </View>
                  <Text style={styles.commentTime}>
                    {relativeTime(comment.createdAt)}
                  </Text>
                </View>
                <Text style={styles.commentBody}>{comment.body}</Text>
                {comment.authorId === currentUserId ? (
                  confirmingCommentId === comment.id ? (
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmText}>Delete?</Text>
                      <Pressable
                        onPress={() => handleDeleteComment(comment.id)}
                      >
                        <Text style={styles.confirmYes}>Delete</Text>
                      </Pressable>
                      <Pressable onPress={() => setConfirmingCommentId(null)}>
                        <Text style={styles.confirmCancel}>Cancel</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => setConfirmingCommentId(comment.id)}
                    >
                      <Text style={styles.deleteLink}>Delete</Text>
                    </Pressable>
                  )
                ) : null}
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={commentBody}
            onChangeText={setCommentBody}
            placeholder="Add a comment…"
            placeholderTextColor="#9B8CAF"
            style={styles.composerInput}
            multiline
            maxLength={4000}
          />
          <Pressable
            style={[
              styles.sendButton,
              (commentBody.trim().length === 0 || sending) &&
                styles.sendDisabled,
            ]}
            disabled={commentBody.trim().length === 0 || sending}
            onPress={handleSendComment}
          >
            <Text style={styles.sendText}>{sending ? '…' : 'Send'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  back: { fontSize: 16, color: '#6D28D9', fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  cover: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  time: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6D28D9',
    marginBottom: 6,
  },
  title: { fontSize: 28, fontWeight: '900', color: '#1F1438', marginBottom: 4 },
  host: { fontSize: 15, color: '#76698C', marginBottom: 16 },
  location: { fontSize: 15, color: '#2C2340', marginBottom: 10 },
  description: {
    fontSize: 16,
    color: '#2C2340',
    lineHeight: 23,
    marginBottom: 16,
  },
  counts: {
    fontSize: 14,
    color: '#4A3D63',
    fontWeight: '700',
    marginBottom: 22,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4A3D63',
    marginBottom: 12,
  },
  rsvpRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  rsvpButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
  },
  rsvpButtonOn: { backgroundColor: '#6D28D9', borderColor: '#6D28D9' },
  rsvpText: { fontSize: 15, fontWeight: '800', color: '#4A3D63' },
  rsvpTextOn: { color: '#FFFFFF' },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  attendeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeInitial: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  attendeeName: { fontSize: 16, color: '#1F1438', fontWeight: '600' },
  emptyText: { fontSize: 15, color: '#76698C' },
  noComments: { fontSize: 15, color: '#76698C', lineHeight: 22 },
  commentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    marginBottom: 10,
  },
  commentHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentAuthor: { fontSize: 15, fontWeight: '800', color: '#1F1438' },
  commentTime: { fontSize: 12, color: '#8A7BA3' },
  commentBody: { fontSize: 15, color: '#2C2340', lineHeight: 21 },
  deleteLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B4243F',
    marginTop: 10,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
  },
  confirmText: { fontSize: 13, color: '#67597F', marginRight: 'auto' },
  confirmYes: { fontSize: 13, fontWeight: '800', color: '#B4243F' },
  confirmCancel: { fontSize: 13, fontWeight: '700', color: '#6D28D9' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E7DFF5',
    backgroundColor: '#FDFCFF',
  },
  composerInput: {
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
  sendDisabled: { opacity: 0.5 },
  sendText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});

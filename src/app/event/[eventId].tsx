import { Feather } from '@expo/vector-icons';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icon';
import { ReportDialog } from '@/components/report-dialog';
import { UserActionsSheet } from '@/components/user-actions-sheet';
import type { ReportTargetType } from '@/lib/reports';
import { likeIcons, rsvpIcons } from '@/constants/icons';
import {
  createEventComment,
  deleteEventComment,
  EventComment,
  EventDetail,
  fetchEvent,
  fetchEventComments,
  clearRsvp,
  formatEventTime,
  RsvpStatus,
  setEventCommentLike,
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
  const insets = useSafeAreaInsets();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [sending, setSending] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [confirmingCommentId, setConfirmingCommentId] = useState<string | null>(
    null,
  );
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [reportTarget, setReportTarget] = useState<{
    type: ReportTargetType;
    id: string;
    label: string;
  } | null>(null);
  const [eventMenu, setEventMenu] = useState(false);

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
    setRsvpError(null);
    // Tapping the option you already picked clears the RSVP (undo it).
    const { error } =
      event?.myStatus === status
        ? await clearRsvp(eventId)
        : await setRsvp(eventId, status);
    if (error) {
      setRsvpError(
        error.includes('full') ? 'This event is full.' : error,
      );
    }
    await load();
    setUpdating(false);
  };

  const handleSendComment = async () => {
    if (!eventId || commentBody.trim().length === 0) return;
    setSending(true);
    const { error } = await createEventComment(
      eventId,
      commentBody,
      replyingTo?.id ?? null,
    );
    setSending(false);
    if (error) {
      setCommentError(error);
      return;
    }
    setCommentError(null);
    setCommentBody('');
    setReplyingTo(null);
    await load();
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteEventComment(commentId);
    setConfirmingCommentId(null);
    await load();
  };

  const handleToggleCommentLike = async (commentId: string) => {
    const target = comments.find((c) => c.id === commentId);
    if (!target) return;
    const nextLiked = !target.likedByMe;
    const delta = nextLiked ? 1 : -1;
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, likedByMe: nextLiked, likeCount: c.likeCount + delta }
          : c,
      ),
    );
    const { error: likeError } = await setEventCommentLike(commentId, nextLiked);
    if (likeError) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, likedByMe: !nextLiked, likeCount: c.likeCount - delta }
            : c,
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

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>This event is no longer available.</Text>
      </SafeAreaView>
    );
  }

  const isFull =
    event.capacity != null && event.goingCount >= event.capacity;

  // Group comments into threads: top-level comments and their nested replies.
  const childrenByParent = new Map<string, EventComment[]>();
  for (const c of comments) {
    if (c.parentCommentId) {
      const arr = childrenByParent.get(c.parentCommentId) ?? [];
      arr.push(c);
      childrenByParent.set(c.parentCommentId, arr);
    }
  }
  const topLevelComments = comments.filter((c) => !c.parentCommentId);

  const renderComment = (comment: EventComment, depth: number) => {
    const children = childrenByParent.get(comment.id) ?? [];
    const mine = comment.authorId === currentUserId;
    return (
      <View key={comment.id}>
        <View style={[styles.commentCard, depth > 0 && styles.commentNested]}>
          <View style={styles.commentHead}>
            <View style={styles.commentAuthorRow}>
              <Avatar
                name={comment.authorName}
                url={comment.authorAvatar}
                size={28}
              />
              <Text style={styles.commentAuthor}>{comment.authorName}</Text>
            </View>
            <Text style={styles.commentTime}>
              {relativeTime(comment.createdAt)}
            </Text>
          </View>
          <Text style={styles.commentBody}>{comment.body}</Text>

          {confirmingCommentId === comment.id ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmText}>Delete?</Text>
              <Pressable onPress={() => handleDeleteComment(comment.id)}>
                <Text style={styles.confirmYes}>Delete</Text>
              </Pressable>
              <Pressable onPress={() => setConfirmingCommentId(null)}>
                <Text style={styles.confirmCancel}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.commentActions}>
              <Pressable
                style={styles.commentLike}
                onPress={() => handleToggleCommentLike(comment.id)}
                hitSlop={8}
              >
                <Icon
                  source={
                    comment.likedByMe ? likeIcons.filled : likeIcons.outline
                  }
                  size={15}
                  color={comment.likedByMe ? '#E23E57' : '#8A7BA3'}
                />
                {comment.likeCount > 0 ? (
                  <Text style={styles.commentLikeCount}>
                    {comment.likeCount}
                  </Text>
                ) : null}
              </Pressable>
              {event.allowComments ? (
                <Pressable
                  onPress={() =>
                    setReplyingTo({ id: comment.id, name: comment.authorName })
                  }
                >
                  <Text style={styles.replyLink}>Reply</Text>
                </Pressable>
              ) : null}
              {mine ? (
                <Pressable onPress={() => setConfirmingCommentId(comment.id)}>
                  <Text style={styles.commentDelete}>Delete</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() =>
                    setReportTarget({
                      type: 'event_comment',
                      id: comment.id,
                      label: 'comment',
                    })
                  }
                >
                  <Text style={styles.commentReport}>Report</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
        {children.map((child) => renderComment(child, depth + 1))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        {event.hostId !== currentUserId ? (
          <Pressable onPress={() => setEventMenu(true)} hitSlop={12}>
            <Feather name="more-horizontal" size={22} color="#4A3D63" />
          </Pressable>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
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

          {event.rsvpRequired || event.capacity != null ? (
            <View style={styles.badgeRow}>
              {event.rsvpRequired ? (
                <Text style={styles.metaBadge}>RSVP required</Text>
              ) : null}
              {event.capacity != null ? (
                <Text
                  style={[styles.metaBadge, isFull && styles.metaBadgeFull]}
                >
                  {isFull ? 'Full' : `${event.goingCount}/${event.capacity} spots`}
                </Text>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.counts}>
            {event.goingCount} going · {event.maybeCount} maybe
          </Text>

          <Text style={styles.sectionLabel}>Your response</Text>
          <View style={styles.rsvpRow}>
            {OPTIONS.map((option) => {
              const selected = event.myStatus === option.status;
              const blocked =
                option.status === 'going' && isFull && !selected;
              return (
                <Pressable
                  key={option.status}
                  style={[
                    styles.rsvpButton,
                    selected && styles.rsvpButtonOn,
                    blocked && styles.rsvpButtonDisabled,
                  ]}
                  disabled={updating || blocked}
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
          {rsvpError ? (
            <Text style={styles.rsvpError}>{rsvpError}</Text>
          ) : null}

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
              No comments yet. Ask a question or say you&apos;re in.
            </Text>
          ) : (
            topLevelComments.map((comment) => renderComment(comment, 0))
          )}
        </ScrollView>

        {event.allowComments ? (
          <View style={styles.composerArea}>
            {commentError ? (
              <Text style={styles.commentError}>{commentError}</Text>
            ) : null}
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
            <View
              style={[styles.composer, { paddingBottom: insets.bottom + 8 }]}
            >
              <TextInput
                value={commentBody}
                onChangeText={setCommentBody}
                placeholder={
                  replyingTo ? `Reply to ${replyingTo.name}…` : 'Add a comment…'
                }
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
          </View>
        ) : (
          <View style={styles.commentsOff}>
            <Text style={styles.commentsOffText}>
              Comments are turned off for this event.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>

      <UserActionsSheet
        visible={eventMenu}
        userId={event.hostId}
        userName={event.hostName}
        reportLabel="Report event"
        onClose={() => setEventMenu(false)}
        onReport={() => {
          setEventMenu(false);
          setReportTarget({ type: 'event', id: event.id, label: 'event' });
        }}
        onBlocked={() => {
          setEventMenu(false);
          router.back();
        }}
      />

      <ReportDialog
        visible={reportTarget !== null}
        targetType={reportTarget?.type ?? 'event_comment'}
        targetId={reportTarget?.id ?? ''}
        targetLabel={reportTarget?.label ?? 'comment'}
        onClose={() => setReportTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
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
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  metaBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6D28D9',
    backgroundColor: '#F1ECFA',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    overflow: 'hidden',
  },
  metaBadgeFull: { color: '#B4243F', backgroundColor: '#FDE7EC' },
  counts: {
    fontSize: 14,
    color: '#4A3D63',
    fontWeight: '700',
    marginBottom: 22,
  },
  rsvpButtonDisabled: { opacity: 0.4 },
  rsvpError: {
    fontSize: 14,
    color: '#B4243F',
    fontWeight: '600',
    marginTop: -12,
    marginBottom: 20,
  },
  commentsOff: {
    borderTopWidth: 1,
    borderTopColor: '#E7DFF5',
    padding: 16,
    backgroundColor: '#FDFCFF',
  },
  commentsOffText: {
    fontSize: 14,
    color: '#76698C',
    textAlign: 'center',
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
  composerArea: {
    borderTopWidth: 1,
    borderTopColor: '#E7DFF5',
    backgroundColor: '#FDFCFF',
  },
  commentError: {
    fontSize: 13,
    color: '#B4243F',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  replyingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F1F8',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 10,
  },
  replyingText: { fontSize: 13, fontWeight: '700', color: '#4A3D63' },
  replyingCancel: { fontSize: 14, fontWeight: '800', color: '#8A7BA3' },
  commentNested: { marginLeft: 24 },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 10,
  },
  replyLink: { fontSize: 13, fontWeight: '700', color: '#6D28D9' },
  commentDelete: { fontSize: 13, fontWeight: '700', color: '#B4243F' },
  commentReport: { fontSize: 13, fontWeight: '700', color: '#8A7BA3' },
  commentLike: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  commentLikeCount: { fontSize: 13, fontWeight: '700', color: '#8A7BA3' },
  composerInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
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

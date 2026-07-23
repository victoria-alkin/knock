import { Feather } from '@expo/vector-icons';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useCallback, useState } from 'react';
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { ReportDialog } from '@/components/report-dialog';
import { UserActionsSheet } from '@/components/user-actions-sheet';
import {
  fetchMessages,
  getConversationOtherId,
  markConversationRead,
  Message,
  sendMessage,
} from '@/lib/dms';
import { getCurrentUserId } from '@/lib/posts';

export default function ConversationScreen() {
  const router = useRouter();
  const { conversationId, otherName } = useLocalSearchParams<{
    conversationId: string;
    otherName?: string;
  }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    if (!conversationId) return;
    const [msgs, uid, otherId] = await Promise.all([
      fetchMessages(conversationId),
      getCurrentUserId(),
      getConversationOtherId(conversationId),
    ]);
    setMessages(msgs);
    setCurrentUserId(uid);
    setOtherUserId(otherId);
    setLoading(false);
    // Opening the thread clears its unread badge.
    await markConversationRead(conversationId);
  }, [conversationId]);

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
    if (!conversationId || body.trim().length === 0) return;
    setSending(true);
    await sendMessage(conversationId, body);
    setBody('');
    await load();
    setSending(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}
        >
          <Feather name="chevron-left" size={26} color="#6D28D9" />
        </Pressable>
        <Text style={styles.headerName}>{otherName ?? 'Conversation'}</Text>
        <Pressable
          onPress={() => setShowActions(true)}
          hitSlop={12}
          style={styles.headerSpacer}
        >
          <Feather name="more-horizontal" size={22} color="#8A7BA3" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <ActivityIndicator color="#6D28D9" style={styles.loader} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.messages}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 ? (
              <Text style={styles.emptyText}>
                Say hello to {otherName ?? 'your neighbor'}.
              </Text>
            ) : (
              messages.map((m, i) => {
                const mine = m.senderId === currentUserId;
                const showDelivered = mine && i === messages.length - 1;
                return (
                  <View
                    key={m.id}
                    style={mine ? styles.rowMine : styles.rowTheirs}
                  >
                    <View
                      style={[
                        styles.bubble,
                        mine ? styles.bubbleMine : styles.bubbleTheirs,
                      ]}
                    >
                      <Text style={mine ? styles.textMine : styles.textTheirs}>
                        {m.body}
                      </Text>
                    </View>
                    {showDelivered ? (
                      <Text style={styles.deliveredText}>Delivered</Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        <View
          style={[styles.composer, { paddingBottom: insets.bottom + 8 }]}
        >
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Message…"
            placeholderTextColor="#9B8CAF"
            style={styles.input}
            multiline
            maxLength={4000}
          />
          <Pressable
            style={[
              styles.sendButton,
              (body.trim().length === 0 || sending) && styles.sendDisabled,
            ]}
            disabled={body.trim().length === 0 || sending}
            onPress={handleSend}
          >
            <Text style={styles.sendText}>{sending ? '…' : 'Send'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <UserActionsSheet
        visible={showActions}
        userId={otherUserId ?? ''}
        userName={otherName ?? 'this neighbor'}
        onClose={() => setShowActions(false)}
        onReport={() => {
          setShowActions(false);
          setReporting(true);
        }}
        onBlocked={() => {
          setShowActions(false);
          router.back();
        }}
      />

      <ReportDialog
        visible={reporting}
        targetType="dm"
        targetId={conversationId ?? ''}
        targetLabel="conversation"
        onClose={() => setReporting(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E7DFF5',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#F1ECFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: { fontSize: 18, fontWeight: '800', color: '#1F1438', flex: 1 },
  headerSpacer: { width: 34, alignItems: 'flex-end', justifyContent: 'center' },
  loader: { marginTop: 40 },
  messages: { padding: 16, gap: 8 },
  emptyText: {
    fontSize: 15,
    color: '#76698C',
    textAlign: 'center',
    marginTop: 40,
  },
  rowMine: { alignItems: 'flex-end' },
  rowTheirs: { alignItems: 'flex-start' },
  deliveredText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9B8CAF',
    marginTop: 3,
    marginRight: 4,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: '#6D28D9',
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7DFF5',
    borderBottomLeftRadius: 4,
  },
  textMine: { color: '#FFFFFF', fontSize: 15, lineHeight: 21 },
  textTheirs: { color: '#2C2340', fontSize: 15, lineHeight: 21 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E7DFF5',
    backgroundColor: '#FDFCFF',
  },
  input: {
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

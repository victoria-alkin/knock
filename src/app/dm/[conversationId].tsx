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
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchMessages, Message, sendMessage } from '@/lib/dms';
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

  const load = useCallback(async () => {
    if (!conversationId) return;
    const [msgs, uid] = await Promise.all([
      fetchMessages(conversationId),
      getCurrentUserId(),
    ]);
    setMessages(msgs);
    setCurrentUserId(uid);
    setLoading(false);
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
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.headerName}>{otherName ?? 'Conversation'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <ActivityIndicator color="#6D28D9" style={styles.loader} />
        ) : (
          <ScrollView contentContainerStyle={styles.messages}>
            {messages.length === 0 ? (
              <Text style={styles.emptyText}>
                Say hello to {otherName ?? 'your neighbor'}.
              </Text>
            ) : (
              messages.map((m) => {
                const mine = m.senderId === currentUserId;
                return (
                  <View
                    key={m.id}
                    style={[
                      styles.bubble,
                      mine ? styles.bubbleMine : styles.bubbleTheirs,
                    ]}
                  >
                    <Text style={mine ? styles.textMine : styles.textTheirs}>
                      {m.body}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        <View style={styles.composer}>
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
  back: { fontSize: 28, color: '#6D28D9', fontWeight: '700', width: 32 },
  headerName: { fontSize: 18, fontWeight: '800', color: '#1F1438', flex: 1 },
  headerSpacer: { width: 32 },
  loader: { marginTop: 40 },
  messages: { padding: 16, gap: 8 },
  emptyText: {
    fontSize: 15,
    color: '#76698C',
    textAlign: 'center',
    marginTop: 40,
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
    paddingVertical: 10,
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

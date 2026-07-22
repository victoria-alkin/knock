import { supabase } from './supabase';

export type ConversationSummary = {
  id: string;
  otherName: string;
  otherAvatar: string | null;
  lastMessage: string | null;
  lastAt: string | null;
  unread: number;
};

export type Message = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

/** Start (or reuse) a DM with another resident. Returns the conversation id. */
export async function startConversation(
  otherUserId: string,
): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase.rpc('start_conversation', {
    other: otherUserId,
  });
  if (error) return { error: error.message };
  return { id: data as string };
}

/** All of the current user's conversations, most recently active first. */
export async function fetchConversations(): Promise<ConversationSummary[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // RLS scopes this to conversations I'm a participant in.
  const { data: convs } = await supabase
    .from('conversations')
    .select('id, user_a, user_b');
  if (!convs || convs.length === 0) return [];

  const rows = convs as { id: string; user_a: string; user_b: string }[];
  const otherIdByConv = new Map<string, string>();
  for (const c of rows) {
    otherIdByConv.set(c.id, c.user_a === user.id ? c.user_b : c.user_a);
  }

  const otherIds = [...new Set([...otherIdByConv.values()])];
  const convIds = rows.map((c) => c.id);

  const [{ data: profiles }, { data: msgs }, { data: reads }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', otherIds),
      supabase
        .from('messages')
        .select('conversation_id, sender_id, body, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('conversation_reads')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id),
    ]);

  // How far each conversation has been read by me.
  const readByConv = new Map<string, number>();
  for (const r of (reads ?? []) as {
    conversation_id: string;
    last_read_at: string;
  }[]) {
    readByConv.set(r.conversation_id, new Date(r.last_read_at).getTime());
  }

  const nameById = new Map<string, string>();
  const avatarById = new Map<string, string | null>();
  for (const p of (profiles ?? []) as {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  }[]) {
    nameById.set(p.id, p.display_name ?? 'Neighbor');
    avatarById.set(p.id, p.avatar_url);
  }

  const lastByConv = new Map<string, { body: string; created_at: string }>();
  const unreadByConv = new Map<string, number>();
  for (const m of (msgs ?? []) as {
    conversation_id: string;
    sender_id: string;
    body: string;
    created_at: string;
  }[]) {
    if (!lastByConv.has(m.conversation_id)) {
      lastByConv.set(m.conversation_id, { body: m.body, created_at: m.created_at });
    }
    // Unread = messages from the other person newer than my last read.
    const lastRead = readByConv.get(m.conversation_id) ?? 0;
    if (m.sender_id !== user.id && new Date(m.created_at).getTime() > lastRead) {
      unreadByConv.set(
        m.conversation_id,
        (unreadByConv.get(m.conversation_id) ?? 0) + 1,
      );
    }
  }

  const summaries: ConversationSummary[] = rows
    // Only show conversations that actually have messages. Starting one from
    // the directory shouldn't create an empty row until someone writes.
    .filter((c) => lastByConv.has(c.id))
    .map((c) => {
      const last = lastByConv.get(c.id) ?? null;
      const otherId = otherIdByConv.get(c.id) ?? '';
      return {
        id: c.id,
        otherName: nameById.get(otherId) ?? 'Neighbor',
        otherAvatar: avatarById.get(otherId) ?? null,
        lastMessage: last?.body ?? null,
        lastAt: last?.created_at ?? null,
        unread: unreadByConv.get(c.id) ?? 0,
      };
    });

  summaries.sort((x, y) => (y.lastAt ?? '').localeCompare(x.lastAt ?? ''));
  return summaries;
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return (data as { id: string; sender_id: string; body: string; created_at: string }[]).map(
    (m) => ({
      id: m.id,
      senderId: m.sender_id,
      body: m.body,
      createdAt: m.created_at,
    }),
  );
}

/** Total unread messages across all of the current user's conversations. */
export async function getUnreadDmCount(): Promise<number> {
  const summaries = await fetchConversations();
  return summaries.reduce((sum, c) => sum + c.unread, 0);
}

/** Mark a conversation as read up to now (clears its unread badge). */
export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('conversation_reads').upsert(
    {
      conversation_id: conversationId,
      user_id: user.id,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: 'conversation_id,user_id' },
  );
}

export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You are not signed in.' };

  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: body.trim(),
  });
  return error ? { error: error.message } : {};
}

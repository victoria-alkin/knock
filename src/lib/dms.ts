import { supabase } from './supabase';

export type ConversationSummary = {
  id: string;
  otherName: string;
  lastMessage: string | null;
  lastAt: string | null;
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

  const [{ data: profiles }, { data: msgs }] = await Promise.all([
    supabase.from('profiles').select('id, display_name').in('id', otherIds),
    supabase
      .from('messages')
      .select('conversation_id, body, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false }),
  ]);

  const nameById = new Map<string, string>();
  for (const p of (profiles ?? []) as { id: string; display_name: string | null }[]) {
    nameById.set(p.id, p.display_name ?? 'Neighbor');
  }

  const lastByConv = new Map<string, { body: string; created_at: string }>();
  for (const m of (msgs ?? []) as {
    conversation_id: string;
    body: string;
    created_at: string;
  }[]) {
    if (!lastByConv.has(m.conversation_id)) {
      lastByConv.set(m.conversation_id, { body: m.body, created_at: m.created_at });
    }
  }

  const summaries: ConversationSummary[] = rows.map((c) => {
    const last = lastByConv.get(c.id) ?? null;
    return {
      id: c.id,
      otherName: nameById.get(otherIdByConv.get(c.id) ?? '') ?? 'Neighbor',
      lastMessage: last?.body ?? null,
      lastAt: last?.created_at ?? null,
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

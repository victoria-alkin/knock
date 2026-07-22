import { supabase } from './supabase';

export type AppNotification = {
  id: string;
  type: string;
  body: string;
  read: boolean;
  createdAt: string;
  actorName: string;
  postId: string | null;
  conversationId: string | null;
  eventId: string | null;
  /** Start time of the linked event, if any (for event reminders). */
  eventStartsAt: string | null;
};

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id, type, body, read, created_at, actor_name, post_id, conversation_id, event_id',
    )
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];
  const rows = (
    data as {
      id: string;
      type: string;
      body: string;
      read: boolean;
      created_at: string;
      actor_name: string;
      post_id: string | null;
      conversation_id: string | null;
      event_id: string | null;
    }[]
  ).map((n) => ({
    id: n.id,
    type: n.type,
    body: n.body,
    read: n.read,
    createdAt: n.created_at,
    actorName: n.actor_name,
    postId: n.post_id,
    conversationId: n.conversation_id,
    eventId: n.event_id,
    eventStartsAt: null as string | null,
  }));

  // Attach each linked event's start time so reminders can show the date and
  // time in the viewer's own timezone (the server can't know it).
  const eventIds = [...new Set(rows.map((n) => n.eventId).filter(Boolean))];
  if (eventIds.length > 0) {
    const { data: events } = await supabase
      .from('events')
      .select('id, starts_at')
      .in('id', eventIds as string[]);
    const startById = new Map(
      (events ?? []).map((e) => [
        (e as { id: string }).id,
        (e as { starts_at: string }).starts_at,
      ]),
    );
    for (const n of rows) {
      if (n.eventId) n.eventStartsAt = startById.get(n.eventId) ?? null;
    }
  }

  return rows;
}

/** Count of unread notifications for the badge. */
export async function getUnreadCount(): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('read', false);
  return count ?? 0;
}

export async function markAllRead(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);
}

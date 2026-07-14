import { getCurrentUserId } from './posts';
import { supabase } from './supabase';

export type RsvpStatus = 'going' | 'maybe' | 'not_going';

export type EventSummary = {
  id: string;
  title: string;
  location: string | null;
  startsAt: string;
  hostName: string;
  imageUrl: string | null;
  capacity: number | null;
  rsvpRequired: boolean;
  goingCount: number;
  myStatus: RsvpStatus | null;
};

export type EventDetail = EventSummary & {
  description: string | null;
  hostId: string;
  allowComments: boolean;
  maybeCount: number;
  notGoingCount: number;
  going: { name: string; avatar: string | null }[];
};

type RawEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  host_id: string;
  image_url: string | null;
  capacity: number | null;
  rsvp_required: boolean | null;
  allow_comments: boolean | null;
  profiles: { display_name: string | null } | null;
  event_rsvps: {
    status: RsvpStatus;
    user_id: string;
    profiles: { display_name: string | null; avatar_url: string | null } | null;
  }[];
};

const EVENT_SELECT =
  'id, title, description, location, starts_at, host_id, image_url, capacity, rsvp_required, allow_comments, profiles ( display_name ), event_rsvps ( status, user_id, profiles ( display_name, avatar_url ) )';

/** Upcoming events for a building, soonest first. */
export async function fetchEvents(buildingId: string): Promise<EventSummary[]> {
  const [{ data, error }, myId] = await Promise.all([
    supabase
      .from('events')
      .select(EVENT_SELECT)
      .eq('building_id', buildingId)
      .gte('starts_at', new Date(Date.now() - 12 * 3600 * 1000).toISOString())
      .order('starts_at', { ascending: true })
      .limit(50),
    getCurrentUserId(),
  ]);

  if (error || !data) return [];
  return (data as unknown as RawEvent[]).map((row) => toSummary(row, myId));
}

export type MyEventRelation = 'hosted' | 'attended';
export type MyEvent = EventSummary & { relation: MyEventRelation };

/**
 * Events the current user is involved in — both the ones they host and the
 * ones they've RSVP'd "going" to — tagged with which, most recent first.
 */
export async function fetchMyEvents(): Promise<MyEvent[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [hosted, rsvps] = await Promise.all([
    supabase
      .from('events')
      .select(EVENT_SELECT)
      .eq('host_id', user.id)
      .limit(200),
    supabase
      .from('event_rsvps')
      .select('event_id')
      .eq('user_id', user.id)
      .eq('status', 'going'),
  ]);

  // Hosting takes precedence over attending for the same event.
  const byId = new Map<string, MyEvent>();
  for (const row of (hosted.data ?? []) as unknown as RawEvent[]) {
    byId.set(row.id, { ...toSummary(row, user.id), relation: 'hosted' });
  }

  const attendedIds = (rsvps.data ?? [])
    .map((r) => (r as { event_id: string }).event_id)
    .filter((id) => !byId.has(id));

  if (attendedIds.length > 0) {
    const { data } = await supabase
      .from('events')
      .select(EVENT_SELECT)
      .in('id', attendedIds);
    for (const row of (data ?? []) as unknown as RawEvent[]) {
      byId.set(row.id, { ...toSummary(row, user.id), relation: 'attended' });
    }
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
  );
}

export async function fetchEvent(eventId: string): Promise<EventDetail | null> {
  const [{ data, error }, myId] = await Promise.all([
    supabase.from('events').select(EVENT_SELECT).eq('id', eventId).maybeSingle(),
    getCurrentUserId(),
  ]);

  if (error || !data) return null;
  const row = data as unknown as RawEvent;
  const summary = toSummary(row, myId);

  return {
    ...summary,
    description: row.description,
    hostId: row.host_id,
    allowComments: row.allow_comments ?? true,
    maybeCount: row.event_rsvps.filter((r) => r.status === 'maybe').length,
    notGoingCount: row.event_rsvps.filter((r) => r.status === 'not_going')
      .length,
    going: row.event_rsvps
      .filter((r) => r.status === 'going')
      .map((r) => ({
        name: r.profiles?.display_name ?? 'Neighbor',
        avatar: r.profiles?.avatar_url ?? null,
      })),
  };
}

export async function createEvent(fields: {
  buildingId: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  imageUrl: string | null;
  capacity: number | null;
  rsvpRequired: boolean;
  allowComments: boolean;
}): Promise<{ error?: string; id?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You are not signed in.' };

  const { data, error } = await supabase
    .from('events')
    .insert({
      building_id: fields.buildingId,
      host_id: user.id,
      title: fields.title.trim(),
      description: fields.description.trim() || null,
      location: fields.location.trim() || null,
      starts_at: fields.startsAt,
      image_url: fields.imageUrl,
      capacity: fields.capacity,
      rsvp_required: fields.rsvpRequired,
      allow_comments: fields.allowComments,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { id: (data as { id: string }).id };
}

export type EventComment = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  body: string;
  createdAt: string;
};

export async function fetchEventComments(
  eventId: string,
): Promise<EventComment[]> {
  const { data, error } = await supabase
    .from('event_comments')
    .select('id, author_id, body, created_at, profiles ( display_name, avatar_url )')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return (
    data as unknown as {
      id: string;
      author_id: string;
      body: string;
      created_at: string;
      profiles: { display_name: string | null; avatar_url: string | null } | null;
    }[]
  ).map((row) => ({
    id: row.id,
    authorId: row.author_id,
    authorName: row.profiles?.display_name ?? 'Neighbor',
    authorAvatar: row.profiles?.avatar_url ?? null,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function createEventComment(
  eventId: string,
  body: string,
): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You are not signed in.' };

  const { error } = await supabase.from('event_comments').insert({
    event_id: eventId,
    author_id: user.id,
    body: body.trim(),
  });
  return error ? { error: error.message } : {};
}

export async function deleteEventComment(
  commentId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('event_comments')
    .delete()
    .eq('id', commentId);
  return error ? { error: error.message } : {};
}

export async function setRsvp(
  eventId: string,
  status: RsvpStatus,
): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You are not signed in.' };

  const { error } = await supabase
    .from('event_rsvps')
    .upsert(
      { event_id: eventId, user_id: user.id, status },
      { onConflict: 'event_id,user_id' },
    );

  return error ? { error: error.message } : {};
}

function toSummary(row: RawEvent, myId: string | null): EventSummary {
  return {
    id: row.id,
    title: row.title,
    location: row.location,
    startsAt: row.starts_at,
    hostName: row.profiles?.display_name ?? 'Neighbor',
    imageUrl: row.image_url,
    capacity: row.capacity,
    rsvpRequired: row.rsvp_required ?? false,
    goingCount: row.event_rsvps.filter((r) => r.status === 'going').length,
    myStatus: row.event_rsvps.find((r) => r.user_id === myId)?.status ?? null,
  };
}

/** e.g. "Fri, Aug 1 · 7:00 PM" */
export function formatEventTime(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const time = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${day} · ${time}`;
}

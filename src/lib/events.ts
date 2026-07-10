import { getCurrentUserId } from './posts';
import { supabase } from './supabase';

export type RsvpStatus = 'going' | 'maybe' | 'not_going';

export type EventSummary = {
  id: string;
  title: string;
  location: string | null;
  startsAt: string;
  hostName: string;
  goingCount: number;
  myStatus: RsvpStatus | null;
};

export type EventDetail = EventSummary & {
  description: string | null;
  hostId: string;
  maybeCount: number;
  notGoingCount: number;
  going: string[]; // display names
};

type RawEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  host_id: string;
  profiles: { display_name: string | null } | null;
  event_rsvps: {
    status: RsvpStatus;
    user_id: string;
    profiles: { display_name: string | null } | null;
  }[];
};

const EVENT_SELECT =
  'id, title, description, location, starts_at, host_id, profiles ( display_name ), event_rsvps ( status, user_id, profiles ( display_name ) )';

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
    maybeCount: row.event_rsvps.filter((r) => r.status === 'maybe').length,
    notGoingCount: row.event_rsvps.filter((r) => r.status === 'not_going')
      .length,
    going: row.event_rsvps
      .filter((r) => r.status === 'going')
      .map((r) => r.profiles?.display_name ?? 'Neighbor'),
  };
}

export async function createEvent(fields: {
  buildingId: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
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
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { id: (data as { id: string }).id };
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

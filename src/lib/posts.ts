import { supabase } from './supabase';

export type Post = {
  id: string;
  body: string;
  channel: string;
  createdAt: string;
  authorName: string;
  replyCount: number;
};

export type Reply = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
};

/** Recent posts for a building, newest first. Optionally filtered to a channel. */
export async function fetchBuildingPosts(
  buildingId: string,
  channel?: string,
): Promise<Post[]> {
  let query = supabase
    .from('posts')
    .select(
      'id, body, channel, created_at, profiles ( display_name ), replies ( count )',
    )
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (channel) {
    query = query.eq('channel', channel);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as unknown as RawPost[]).map(toPost);
}

/** A single post by id (null if not accessible). */
export async function fetchPost(postId: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(
      'id, body, channel, created_at, profiles ( display_name ), replies ( count )',
    )
    .eq('id', postId)
    .maybeSingle();

  if (error || !data) return null;
  return toPost(data as unknown as RawPost);
}

/** Replies to a post, oldest first. */
export async function fetchReplies(postId: string): Promise<Reply[]> {
  const { data, error } = await supabase
    .from('replies')
    .select('id, body, created_at, profiles ( display_name )')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  return (data as unknown as RawReply[]).map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    authorName: row.profiles?.display_name ?? 'Neighbor',
  }));
}

export async function createReply(
  postId: string,
  body: string,
): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You are not signed in.' };

  const { error } = await supabase.from('replies').insert({
    post_id: postId,
    author_id: user.id,
    body: body.trim(),
  });

  return error ? { error: error.message } : {};
}

export async function createPost(
  buildingId: string,
  channel: string,
  body: string,
): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You are not signed in.' };

  const { error } = await supabase.from('posts').insert({
    building_id: buildingId,
    author_id: user.id,
    channel,
    body: body.trim(),
  });

  return error ? { error: error.message } : {};
}

/** Short relative time like "just now", "5m", "3h", "2d". */
export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function toPost(row: RawPost): Post {
  return {
    id: row.id,
    body: row.body,
    channel: row.channel,
    createdAt: row.created_at,
    authorName: row.profiles?.display_name ?? 'Neighbor',
    replyCount: row.replies?.[0]?.count ?? 0,
  };
}

type RawPost = {
  id: string;
  body: string;
  channel: string;
  created_at: string;
  profiles: { display_name: string | null } | null;
  replies: { count: number }[] | null;
};

type RawReply = {
  id: string;
  body: string;
  created_at: string;
  profiles: { display_name: string | null } | null;
};

import { supabase } from './supabase';

export type Post = {
  id: string;
  authorId: string;
  body: string;
  channel: string;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
  replyCount: number;
};

export type Reply = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
};

/** The current user's id, or null. */
export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Recent posts for a building, newest first. Optionally filtered to a channel. */
export async function fetchBuildingPosts(
  buildingId: string,
  channel?: string,
): Promise<Post[]> {
  let query = supabase
    .from('posts')
    .select(
      'id, author_id, body, channel, created_at, profiles ( display_name, avatar_url ), replies ( count )',
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
      'id, author_id, body, channel, created_at, profiles ( display_name, avatar_url ), replies ( count )',
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
    .select('id, author_id, body, created_at, profiles ( display_name, avatar_url )')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  return (data as unknown as RawReply[]).map((row) => ({
    id: row.id,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
    authorName: row.profiles?.display_name ?? 'Neighbor',
    authorAvatar: row.profiles?.avatar_url ?? null,
  }));
}

/** Delete a post (RLS restricts this to your own). Cascades its replies. */
export async function deletePost(postId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  return error ? { error: error.message } : {};
}

/** Delete a reply (RLS restricts this to your own). */
export async function deleteReply(replyId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('replies').delete().eq('id', replyId);
  return error ? { error: error.message } : {};
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
    authorId: row.author_id,
    body: row.body,
    channel: row.channel,
    createdAt: row.created_at,
    authorName: row.profiles?.display_name ?? 'Neighbor',
    authorAvatar: row.profiles?.avatar_url ?? null,
    replyCount: row.replies?.[0]?.count ?? 0,
  };
}

type RawProfile = { display_name: string | null; avatar_url: string | null };

type RawPost = {
  id: string;
  author_id: string;
  body: string;
  channel: string;
  created_at: string;
  profiles: RawProfile | null;
  replies: { count: number }[] | null;
};

type RawReply = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles: RawProfile | null;
};

import { supabase } from './supabase';

export type PostUrgency = 'normal' | 'this_week' | 'asap';

export const URGENCY_META: Record<
  Exclude<PostUrgency, 'normal'>,
  { label: string; color: string; bg: string }
> = {
  asap: { label: 'ASAP', color: '#B4243F', bg: '#FDE7EC' },
  this_week: { label: 'This week', color: '#9A6A15', bg: '#FBF3DA' },
};

export type Post = {
  id: string;
  authorId: string;
  body: string;
  channel: string;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
  imageUrl: string | null;
  urgency: PostUrgency;
  allowReplies: boolean;
  allowDms: boolean;
  isAnonymous: boolean;
  pinned: boolean;
  replyCount: number;
  likeCount: number;
  likedByMe: boolean;
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
      'id, author_id, body, channel, created_at, image_url, urgency, allow_replies, allow_dms, is_anonymous, pinned, profiles!posts_author_id_fkey ( display_name, avatar_url ), replies ( count ), post_likes ( count )',
    )
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (channel) {
    query = query.eq('channel', channel);
  }

  // Hide expired posts.
  query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  const { data, error } = await query;
  if (error || !data) return [];

  const posts = (data as unknown as RawPost[]).map(toPost);
  await attachMyLikes(posts);
  return posts;
}

/** A single post by id (null if not accessible). */
export async function fetchPost(postId: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(
      'id, author_id, body, channel, created_at, image_url, urgency, allow_replies, allow_dms, is_anonymous, pinned, profiles!posts_author_id_fkey ( display_name, avatar_url ), replies ( count ), post_likes ( count )',
    )
    .eq('id', postId)
    .maybeSingle();

  if (error || !data) return null;
  const post = toPost(data as unknown as RawPost);
  await attachMyLikes([post]);
  return post;
}

/** Fill in likedByMe for a set of posts based on the current user's likes. */
async function attachMyLikes(posts: Post[]): Promise<void> {
  if (posts.length === 0) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', user.id)
    .in(
      'post_id',
      posts.map((p) => p.id),
    );

  const liked = new Set((data ?? []).map((r) => (r as { post_id: string }).post_id));
  for (const post of posts) {
    post.likedByMe = liked.has(post.id);
  }
}

/** Like or unlike a post. */
export async function setPostLike(
  postId: string,
  liked: boolean,
): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You are not signed in.' };

  if (liked) {
    const { error } = await supabase
      .from('post_likes')
      .upsert(
        { post_id: postId, user_id: user.id },
        { onConflict: 'post_id,user_id' },
      );
    return error ? { error: error.message } : {};
  }

  const { error } = await supabase
    .from('post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', user.id);
  return error ? { error: error.message } : {};
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

/** Pin or unpin a post (RLS restricts this to your own). */
export async function setPostPinned(
  postId: string,
  pinned: boolean,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('posts')
    .update({ pinned })
    .eq('id', postId);
  return error ? { error: error.message } : {};
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

export async function createPost(input: {
  buildingId: string;
  channel: string;
  body: string;
  imageUrl?: string | null;
  urgency?: PostUrgency;
  allowReplies?: boolean;
  allowDms?: boolean;
  isAnonymous?: boolean;
  expiresAt?: string | null;
}): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You are not signed in.' };

  const { error } = await supabase.from('posts').insert({
    building_id: input.buildingId,
    author_id: user.id,
    channel: input.channel,
    body: input.body.trim(),
    image_url: input.imageUrl ?? null,
    urgency: input.urgency ?? 'normal',
    allow_replies: input.allowReplies ?? true,
    allow_dms: input.allowDms ?? true,
    is_anonymous: input.isAnonymous ?? false,
    expires_at: input.expiresAt ?? null,
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
  const anonymous = row.is_anonymous ?? false;
  return {
    id: row.id,
    authorId: row.author_id,
    body: row.body,
    channel: row.channel,
    createdAt: row.created_at,
    // Anonymous posts hide the author's name/avatar in the UI.
    authorName: anonymous ? 'Anonymous' : row.profiles?.display_name ?? 'Neighbor',
    authorAvatar: anonymous ? null : row.profiles?.avatar_url ?? null,
    imageUrl: row.image_url,
    urgency: row.urgency ?? 'normal',
    allowReplies: row.allow_replies ?? true,
    allowDms: row.allow_dms ?? true,
    isAnonymous: anonymous,
    pinned: row.pinned ?? false,
    replyCount: row.replies?.[0]?.count ?? 0,
    likeCount: row.post_likes?.[0]?.count ?? 0,
    likedByMe: false,
  };
}

type RawProfile = { display_name: string | null; avatar_url: string | null };

type RawPost = {
  id: string;
  author_id: string;
  body: string;
  channel: string;
  created_at: string;
  image_url: string | null;
  urgency: PostUrgency | null;
  allow_replies: boolean | null;
  allow_dms: boolean | null;
  is_anonymous: boolean | null;
  pinned: boolean | null;
  profiles: RawProfile | null;
  replies: { count: number }[] | null;
  post_likes: { count: number }[] | null;
};

type RawReply = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles: RawProfile | null;
};

import { supabase } from './supabase';

export type BlockedUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export async function blockUser(userId: string): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You are not signed in.' };

  const { error } = await supabase
    .from('blocks')
    .upsert(
      { blocker_id: user.id, blocked_id: userId },
      { onConflict: 'blocker_id,blocked_id' },
    );
  return error ? { error: error.message } : {};
}

export async function unblockUser(userId: string): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You are not signed in.' };

  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', userId);
  return error ? { error: error.message } : {};
}

/** Users the current user has blocked, with display info for the manage screen. */
export async function fetchBlockedUsers(): Promise<BlockedUser[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from('blocks')
    .select('blocked_id, created_at')
    .eq('blocker_id', user.id)
    .order('created_at', { ascending: false });

  const ids = (rows ?? []).map((r) => (r as { blocked_id: string }).blocked_id);
  if (ids.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', ids);

  const byId = new Map(
    (profiles ?? []).map((p) => [
      (p as { id: string }).id,
      p as { display_name: string | null; avatar_url: string | null },
    ]),
  );

  // Preserve block order (most recent first).
  return ids.map((id) => ({
    id,
    name: byId.get(id)?.display_name ?? 'Neighbor',
    avatarUrl: byId.get(id)?.avatar_url ?? null,
  }));
}

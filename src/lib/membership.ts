import { supabase } from './supabase';

export type MyBuilding = {
  id: string;
  name: string;
  address: string | null;
  verified: boolean;
};

export type MyProfile = {
  full_name: string | null;
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  in_directory: boolean;
};

export type Neighbor = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

/** Opted-in neighbors in your building (display names only). */
export async function getNeighborDirectory(): Promise<Neighbor[]> {
  const { data, error } = await supabase.rpc('get_neighbor_directory');
  if (error || !data) return [];
  return (
    data as { id: string; display_name: string; avatar_url: string | null }[]
  ).map((r) => ({ id: r.id, name: r.display_name, avatarUrl: r.avatar_url }));
}

/**
 * Whether the user has finished onboarding: a restored session AND a building
 * membership. Used by the launch gate to skip onboarding for returning users.
 */
export async function isOnboarded(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return false;

  const building = await getMyBuilding();
  return building !== null;
}

/** The building the current user has most recently joined, or null. */
export async function getMyBuilding(): Promise<MyBuilding | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('building_members')
    .select('verified, buildings ( id, name, address )')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data || !data.buildings) return null;

  const building = data.buildings as unknown as {
    id: string;
    name: string;
    address: string | null;
  };

  return {
    id: building.id,
    name: building.name,
    address: building.address,
    verified: Boolean((data as { verified?: boolean }).verified),
  };
}

/** Update the current user's profile. RLS restricts this to your own row. */
export async function updateProfile(fields: {
  full_name: string;
  display_name: string;
  phone: string;
  avatar_url: string | null;
  in_directory?: boolean;
}): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You are not signed in.' };

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: fields.full_name.trim(),
      display_name: fields.display_name.trim(),
      avatar_url: fields.avatar_url,
      ...(fields.in_directory !== undefined
        ? { in_directory: fields.in_directory }
        : {}),
    })
    .eq('id', user.id);
  if (profileError) return { error: profileError.message };

  const { error: contactError } = await supabase
    .from('private_contact')
    .upsert({ id: user.id, phone: fields.phone.trim() });
  if (contactError) return { error: contactError.message };

  return {};
}

/** Update just the profile picture (leaves name and contact untouched). */
export async function updateAvatar(
  avatarUrl: string | null,
): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You are not signed in.' };

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id);
  return error ? { error: error.message } : {};
}

/** Clear the current session. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** The current user's profile, or null. */
export async function getMyProfile(): Promise<MyProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileRes, contactRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, display_name, avatar_url, in_directory')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('private_contact')
      .select('phone')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  if (!profileRes.data) return null;

  const prof = profileRes.data as {
    full_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
    in_directory: boolean | null;
  };
  const contact = contactRes.data as { phone: string | null } | null;

  return {
    full_name: prof.full_name,
    display_name: prof.display_name,
    phone: contact?.phone ?? null,
    avatar_url: prof.avatar_url,
    in_directory: prof.in_directory ?? true,
  };
}

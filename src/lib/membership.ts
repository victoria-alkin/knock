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
};

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
    })
    .eq('id', user.id);
  if (profileError) return { error: profileError.message };

  const { error: contactError } = await supabase
    .from('private_contact')
    .upsert({ id: user.id, phone: fields.phone.trim() });
  if (contactError) return { error: contactError.message };

  return {};
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
      .select('full_name, display_name, avatar_url')
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
  };
  const contact = contactRes.data as { phone: string | null } | null;

  return {
    full_name: prof.full_name,
    display_name: prof.display_name,
    phone: contact?.phone ?? null,
    avatar_url: prof.avatar_url,
  };
}

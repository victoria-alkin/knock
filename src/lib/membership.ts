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
};

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

/** The current user's profile, or null. */
export async function getMyProfile(): Promise<MyProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('full_name, display_name, phone')
    .eq('id', user.id)
    .maybeSingle();

  return (data as MyProfile) ?? null;
}

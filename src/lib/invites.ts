import { supabase } from './supabase';

// Where shared links point in production (used on native, where there's no
// window.location). On web we use the current origin.
const PRODUCTION_ORIGIN = 'https://knock-psi.vercel.app';

function baseOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return PRODUCTION_ORIGIN;
}

/** Get (creating if needed) the current user's shareable invite link. */
export async function getInviteLink(): Promise<{
  link?: string;
  error?: string;
}> {
  const { data, error } = await supabase.rpc('get_or_create_invite');
  if (error || !data) {
    return { error: error?.message ?? 'Could not create an invite link.' };
  }
  return { link: `${baseOrigin()}/join/${data as string}` };
}

export type InviteInfo = {
  buildingId: string;
  buildingName: string;
  buildingAddress: string | null;
  placeId: string;
  latitude: number | null;
  longitude: number | null;
  inviterName: string;
};

/** Resolve an invite code to its building + inviter (works logged-out). */
export async function getInvite(code: string): Promise<InviteInfo | null> {
  const { data, error } = await supabase.rpc('get_invite', { p_code: code });
  if (error || !data) return null;

  const rows = data as {
    building_id: string;
    building_name: string;
    building_address: string | null;
    place_id: string;
    latitude: number | null;
    longitude: number | null;
    inviter_name: string | null;
  }[];
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    buildingId: row.building_id,
    buildingName: row.building_name,
    buildingAddress: row.building_address,
    placeId: row.place_id,
    latitude: row.latitude,
    longitude: row.longitude,
    inviterName: row.inviter_name ?? 'A neighbor',
  };
}

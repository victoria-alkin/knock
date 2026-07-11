import { getCurrentUserId } from './posts';
import { supabase } from './supabase';

export type ListingKind = 'for_sale' | 'giving_away' | 'looking_for';
export type ListingStatus = 'available' | 'sold';

export type Listing = {
  id: string;
  kind: ListingKind;
  title: string;
  description: string | null;
  priceCents: number | null;
  status: ListingStatus;
  sellerId: string;
  sellerName: string;
  imageUrl: string | null;
  createdAt: string;
};

type RawListing = {
  id: string;
  kind: ListingKind;
  title: string;
  description: string | null;
  price_cents: number | null;
  status: ListingStatus;
  seller_id: string;
  image_url: string | null;
  created_at: string;
  profiles: { display_name: string | null } | null;
};

const LISTING_SELECT =
  'id, kind, title, description, price_cents, status, seller_id, image_url, created_at, profiles ( display_name )';

export async function fetchListings(buildingId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data) return [];
  return (data as unknown as RawListing[]).map(toListing);
}

export async function fetchListing(listingId: string): Promise<Listing | null> {
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('id', listingId)
    .maybeSingle();

  if (error || !data) return null;
  return toListing(data as unknown as RawListing);
}

export async function createListing(fields: {
  buildingId: string;
  kind: ListingKind;
  title: string;
  description: string;
  priceCents: number | null;
  imageUrl: string | null;
}): Promise<{ error?: string; id?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You are not signed in.' };

  const { data, error } = await supabase
    .from('listings')
    .insert({
      building_id: fields.buildingId,
      seller_id: user.id,
      kind: fields.kind,
      title: fields.title.trim(),
      description: fields.description.trim() || null,
      price_cents: fields.kind === 'for_sale' ? fields.priceCents : null,
      image_url: fields.imageUrl,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { id: (data as { id: string }).id };
}

export async function markListingSold(
  listingId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('listings')
    .update({ status: 'sold' })
    .eq('id', listingId);
  return error ? { error: error.message } : {};
}

export async function deleteListing(
  listingId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.from('listings').delete().eq('id', listingId);
  return error ? { error: error.message } : {};
}

export { getCurrentUserId };

function toListing(row: RawListing): Listing {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    priceCents: row.price_cents,
    status: row.status,
    sellerId: row.seller_id,
    sellerName: row.profiles?.display_name ?? 'Neighbor',
    imageUrl: row.image_url,
    createdAt: row.created_at,
  };
}

export const KIND_LABEL: Record<ListingKind, string> = {
  for_sale: 'For sale',
  giving_away: 'Giving away',
  looking_for: 'Looking for',
};

/** Price/label to show for a listing. */
export function listingPriceLabel(listing: Listing): string {
  if (listing.kind === 'giving_away') return 'Free';
  if (listing.kind === 'looking_for') return 'Wanted';
  if (listing.priceCents == null) return 'Contact for price';
  return `$${(listing.priceCents / 100).toFixed(2)}`;
}

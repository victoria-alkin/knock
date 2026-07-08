// Client-side helpers for finding a building via the Google Places proxy.
// The proxy lives in src/app/api/*+api.ts so the API key never reaches the app.

export type BuildingSuggestion = {
  placeId: string;
  name: string; // e.g. "The Mason"
  address: string; // e.g. "123 Main St, Boston, MA"
};

export type BuildingDetails = {
  placeId: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

/**
 * An opaque token that groups a user's keystrokes + final selection into one
 * billable Places "session". Generate one per search, and stop using it once
 * the user selects a building (i.e. after getBuildingDetails runs).
 */
export function newSessionToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function searchBuildings(
  query: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<BuildingSuggestion[]> {
  const res = await fetch('/api/building-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, sessionToken }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Building search failed (${res.status})`);
  }

  const data = (await res.json()) as { suggestions?: BuildingSuggestion[] };
  return data.suggestions ?? [];
}

/** Great-circle distance between two lat/lng points, in meters (Haversine). */
export function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function getBuildingDetails(
  placeId: string,
  sessionToken: string,
): Promise<BuildingDetails> {
  const params = new URLSearchParams({ placeId, sessionToken });
  const res = await fetch(`/api/building-details?${params.toString()}`);

  if (!res.ok) {
    throw new Error(`Building details failed (${res.status})`);
  }

  return (await res.json()) as BuildingDetails;
}

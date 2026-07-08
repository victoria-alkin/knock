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

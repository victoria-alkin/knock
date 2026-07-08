// Server-only proxy for Google Places Details (New).
// Called when the user selects a building: it resolves the full address +
// coordinates and, by reusing the same sessionToken, closes the Autocomplete
// session so those keystroke requests stay on the free/cheap tier.

export async function GET(request: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'Server is missing GOOGLE_PLACES_API_KEY' },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('placeId');
  const sessionToken = searchParams.get('sessionToken');
  if (!placeId) {
    return Response.json({ error: 'Missing placeId' }, { status: 400 });
  }

  const url = new URL(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
  );
  if (sessionToken) {
    url.searchParams.set('sessionToken', sessionToken);
  }

  const googleRes = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
    },
  });

  if (!googleRes.ok) {
    const detail = await googleRes.text();
    return Response.json(
      { error: 'Place details request failed', detail },
      { status: 502 },
    );
  }

  const place = (await googleRes.json()) as {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
  };

  return Response.json({
    placeId: place.id ?? placeId,
    name: place.displayName?.text ?? '',
    address: place.formattedAddress ?? '',
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
  });
}

// Server-only proxy for Google Places Autocomplete (New).
// Keeps GOOGLE_PLACES_API_KEY off the client. Never import this from UI code.

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';

// Keep residential buildings and plain street addresses; drop businesses
// (restaurants, stores, etc.). A prediction is kept if any of its types match.
// Note: Google can't filter these server-side for Autocomplete (address types
// aren't allowed in includedPrimaryTypes), so we filter the predictions here.
const RESIDENTIAL_OR_ADDRESS_TYPES = new Set([
  'apartment_building',
  'apartment_complex',
  'condominium_complex',
  'housing_complex',
  'premise', // a named building or collection of buildings
  'subpremise', // a unit/apartment within a premise
  'street_address',
  'route',
]);

type AutocompleteBody = {
  query?: string;
  sessionToken?: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'Server is missing GOOGLE_PLACES_API_KEY' },
      { status: 500 },
    );
  }

  let body: AutocompleteBody;
  try {
    body = (await request.json()) as AutocompleteBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const query = (body.query ?? '').trim();
  if (query.length < 2) {
    return Response.json({ suggestions: [] });
  }

  const googleRes = await fetch(AUTOCOMPLETE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      // Ask only for what we render — smaller payloads, and it keeps the SKU on
      // the cheaper Autocomplete tier.
      'X-Goog-FieldMask':
        'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types',
    },
    body: JSON.stringify({
      input: query,
      sessionToken: body.sessionToken,
      languageCode: 'en',
      regionCode: 'us',
      includeQueryPredictions: false,
    }),
  });

  if (!googleRes.ok) {
    const detail = await googleRes.text();
    return Response.json(
      { error: 'Places autocomplete request failed', detail },
      { status: 502 },
    );
  }

  const data = (await googleRes.json()) as {
    suggestions?: {
      placePrediction?: {
        placeId?: string;
        types?: string[];
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }[];
  };

  const suggestions = (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId))
    .filter((p) =>
      (p.types ?? []).some((t) => RESIDENTIAL_OR_ADDRESS_TYPES.has(t)),
    )
    .map((p) => ({
      placeId: p.placeId as string,
      name: p.structuredFormat?.mainText?.text ?? '',
      address: p.structuredFormat?.secondaryText?.text ?? '',
    }))
    .filter((b) => b.name.length > 0);

  return Response.json({ suggestions });
}

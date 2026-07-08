// Server-only proxy for Google Places Autocomplete (New).
// Keeps GOOGLE_PLACES_API_KEY off the client. Never import this from UI code.

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';

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
        'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat',
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
    .map((p) => ({
      placeId: p.placeId as string,
      name: p.structuredFormat?.mainText?.text ?? '',
      address: p.structuredFormat?.secondaryText?.text ?? '',
    }))
    .filter((b) => b.name.length > 0);

  return Response.json({ suggestions });
}

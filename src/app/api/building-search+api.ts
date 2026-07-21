// Server-only proxy for Google Places Autocomplete (New).
// Keeps GOOGLE_PLACES_API_KEY off the client. Never import this from UI code.

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';

// Google tags named residential buildings inconsistently — many come back as a
// generic establishment/point_of_interest with no residential type at all (e.g.
// "Graduate Junction" is point_of_interest/establishment/service). An allow-list
// of residential types therefore drops real apartment buildings, so instead we
// keep every prediction EXCEPT ones tagged as an obvious non-residential
// business (restaurants, stores, transit stops, etc.). Google can't filter this
// server-side for Autocomplete, so we do it on the predictions here.
const NON_RESIDENTIAL_TYPES = new Set([
  'restaurant', 'cafe', 'coffee_shop', 'bar', 'bakery', 'meal_takeaway',
  'meal_delivery', 'food', 'store', 'grocery_store', 'grocery_or_supermarket',
  'supermarket', 'convenience_store', 'department_store', 'shopping_mall',
  'clothing_store', 'electronics_store', 'furniture_store', 'hardware_store',
  'home_goods_store', 'jewelry_store', 'liquor_store', 'pet_store', 'shoe_store',
  'book_store', 'bicycle_store', 'florist', 'gym', 'spa', 'beauty_salon',
  'hair_care', 'school', 'primary_school', 'secondary_school', 'university',
  'hospital', 'doctor', 'dentist', 'pharmacy', 'drugstore', 'bank', 'atm',
  'gas_station', 'car_repair', 'car_dealer', 'car_wash', 'car_rental',
  'parking', 'place_of_worship', 'church', 'mosque', 'synagogue',
  'hindu_temple', 'park', 'national_park', 'museum', 'art_gallery',
  'movie_theater', 'night_club', 'library', 'post_office', 'police',
  'fire_station', 'airport', 'train_station', 'subway_station',
  'light_rail_station', 'bus_station', 'transit_station', 'tourist_attraction',
  'stadium', 'courthouse', 'city_hall', 'local_government_office',
  'real_estate_agency', 'insurance_agency', 'lawyer', 'accounting',
  'veterinary_care', 'cemetery', 'campground', 'zoo', 'aquarium',
  'amusement_park', 'bowling_alley', 'casino', 'travel_agency',
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
    .filter((p) => !(p.types ?? []).some((t) => NON_RESIDENTIAL_TYPES.has(t)))
    .map((p) => ({
      placeId: p.placeId as string,
      name: p.structuredFormat?.mainText?.text ?? '',
      address: p.structuredFormat?.secondaryText?.text ?? '',
    }))
    .filter((b) => b.name.length > 0);

  return Response.json({ suggestions });
}

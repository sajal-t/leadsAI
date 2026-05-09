type PlacesSearchResult = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  businessStatus?: string;
  websiteUri?: string;
};

type PlacesSearchResponse = {
  places?: PlacesSearchResult[];
  nextPageToken?: string;
};

const FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.googleMapsUri,places.businessStatus,places.websiteUri,nextPageToken";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPlacesPage(
  apiKey: string,
  query: string,
  pageSize: number,
  pageToken?: string,
) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      pageSize,
      pageToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Places failed: ${response.status}`);
  }

  return (await response.json()) as PlacesSearchResponse;
}

export async function findLeadsFromPlaces(query: string, maxResults = 1000) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_PLACES_API_KEY");
  }

  const pageSize = 20;
  const maxPages = Math.max(1, Math.ceil(maxResults / pageSize));
  const all: PlacesSearchResult[] = [];
  const seen = new Set<string>();
  let nextPageToken: string | undefined;

  for (let page = 0; page < maxPages; page += 1) {
    if (page > 0) {
      // Google nextPageToken may need a short delay before becoming valid.
      await wait(1500);
    }
    const data = await fetchPlacesPage(apiKey, query, pageSize, nextPageToken);
    for (const place of data.places ?? []) {
      if (!seen.has(place.id)) {
        seen.add(place.id);
        all.push(place);
      }
    }
    nextPageToken = data.nextPageToken;
    if (!nextPageToken || all.length >= maxResults) {
      break;
    }
  }

  return all.slice(0, maxResults);
}

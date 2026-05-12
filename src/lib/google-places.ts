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

/**
 * Single Text Search query: Google returns at most ~60 places (3 pages × 20).
 * Asking for 1000 only paginates until Google stops giving nextPageToken (~60).
 */
export async function findLeadsFromPlaces(query: string, maxResults = 60) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_PLACES_API_KEY");
  }

  const pageSize = 20;
  const maxPages = Math.max(1, Math.ceil(Math.min(maxResults, 60) / pageSize));
  const all: PlacesSearchResult[] = [];
  const seen = new Set<string>();
  let nextPageToken: string | undefined;

  for (let page = 0; page < maxPages; page += 1) {
    if (page > 0) {
      // Google nextPageToken may need a short delay before becoming valid.
      // Shorter pause still satisfies most nextPageToken windows; lowers total wait for multi-query runs.
      await wait(850);
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

  return all.slice(0, Math.min(maxResults, 60));
}

/** Build several text queries so we can exceed the per-query ~60 cap by merging unique places. */
export function buildSearchQueryVariants(niche: string, city: string): string[] {
  const cityTrim = city.trim();
  const cityNoComma = cityTrim.replace(/,/g, "").replace(/\s+/g, " ").trim();
  const n = niche.trim();
  const variants = [
    `${n} in ${cityTrim}`,
    `${n} ${cityTrim}`,
    `${n} near ${cityTrim}`,
    `best ${n} ${cityTrim}`,
    `${n} ${cityNoComma}`,
    `top rated ${n} ${cityTrim}`,
    `cheap ${n} ${cityTrim}`,
    `family ${n} ${cityTrim}`,
    `${n} downtown ${cityTrim}`,
    `popular ${n} ${cityTrim}`,
    `${n} open ${cityTrim}`,
    `small ${n} ${cityTrim}`,
    `${n} around ${cityTrim}`,
    `find ${n} ${cityTrim}`,
    `${n} ${cityTrim} area`,
    `local ${n} ${cityTrim}`,
    `${n} new ${cityTrim}`,
    `highly rated ${n} ${cityTrim}`,
    `${n} lunch ${cityTrim}`,
    `${n} dinner ${cityTrim}`,
    `${n} breakfast ${cityTrim}`,
    `${n} delivery ${cityTrim}`,
    `${n} catering ${cityTrim}`,
    `${n} reservations ${cityTrim}`,
    `${n} reviews ${cityTrim}`,
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of variants) {
    const key = v.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(v);
    }
  }
  return out;
}

const BETWEEN_QUERY_MS = 400;

/**
 * How many distinct text queries to run for a target unique count.
 * Heavy overlap between similar strings means we need many queries to approach high targets.
 */
export function computeQueryBudgetForSampleSize(maxTotalUnique: number): number {
  const target = Math.max(60, maxTotalUnique);
  // ~10–25 net-new places per query is typical after overlap; budget scales with target.
  const estimated = Math.ceil(target / 12) + 24;
  return Math.min(220, Math.max(32, estimated));
}

/**
 * Large combinatorial query set (deduped). Supplements hand-picked variants so 500–2000 targets are reachable.
 */
export function expandSearchQueries(niche: string, city: string, maxQueries: number): string[] {
  const c = city.trim().replace(/\s+/g, " ");
  const n = niche.trim().replace(/\s+/g, " ");
  if (!c || !n) return [];

  const cNoComma = c.replace(/,/g, "").replace(/\s+/g, " ").trim();

  const prefixes = [
    "",
    "best ",
    "top ",
    "cheap ",
    "luxury ",
    "affordable ",
    "family ",
    "local ",
    "popular ",
    "award winning ",
    "highly rated ",
    "casual ",
    "new ",
    "authentic ",
    "gourmet ",
    "classic ",
    "modern ",
    "organic ",
    "outdoor ",
  ];

  const locHints = [
    "",
    "north ",
    "south ",
    "east ",
    "west ",
    "central ",
    "downtown ",
    "near downtown ",
    "uptown ",
    "midtown ",
    "metro ",
    "suburban ",
    "waterfront ",
    "airport ",
  ];

  const patterns: string[] = [];

  for (const p of prefixes) {
    for (const L of locHints) {
      const cityPart = L ? `${L}${c}` : c;
      patterns.push(`${p}${n} in ${cityPart}`);
      patterns.push(`${p}${n} near ${cityPart}`);
      patterns.push(`${p}${n} ${cityPart}`);
    }
  }

  patterns.push(`${c} ${n}`, `${c} best ${n}`, `find ${n} ${c}`, `${n} around ${cNoComma}`, `${n} ${cNoComma} area`);

  const base = buildSearchQueryVariants(niche, city);
  const combined = [...base, ...patterns];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of combined) {
    const key = q.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(q.trim());
    if (out.length >= maxQueries) break;
  }

  return out;
}

/**
 * Runs multiple Text Search variants and merges by place id.
 * Each variant still caps at ~60; total uniques grow with query budget (see computeQueryBudgetForSampleSize).
 */
export async function findLeadsFromPlacesMultiQuery(
  niche: string,
  city: string,
  maxTotalUnique = 1000,
): Promise<{ places: PlacesSearchResult[]; queriesUsed: string[]; queryBudget: number }> {
  const queryBudget = computeQueryBudgetForSampleSize(maxTotalUnique);
  const queries = expandSearchQueries(niche, city, queryBudget);
  const merged: PlacesSearchResult[] = [];
  const seen = new Set<string>();
  const used: string[] = [];

  for (let i = 0; i < queries.length; i += 1) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, BETWEEN_QUERY_MS));
    }
    const batch = await findLeadsFromPlaces(queries[i], 60);
    used.push(queries[i]);
    for (const place of batch) {
      if (!seen.has(place.id)) {
        seen.add(place.id);
        merged.push(place);
        if (merged.length >= maxTotalUnique) {
          return { places: merged, queriesUsed: used, queryBudget };
        }
      }
    }
  }

  return { places: merged, queriesUsed: used, queryBudget };
}

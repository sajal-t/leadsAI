/**
 * Map user niche phrases to OSM tag filters (OR across inner arrays = separate queries merged).
 * @see https://wiki.openstreetmap.org/wiki/Map_features
 */
export type OsmTagFilter = { key: string; value: string };

const NICHE_ALIASES: Record<string, OsmTagFilter[]> = {
  restaurant: [{ key: "amenity", value: "restaurant" }],
  restaurants: [{ key: "amenity", value: "restaurant" }],
  food: [
    { key: "amenity", value: "restaurant" },
    { key: "amenity", value: "cafe" },
    { key: "amenity", value: "fast_food" },
  ],
  dentist: [
    { key: "amenity", value: "dentist" },
    { key: "healthcare", value: "dentist" },
  ],
  dental: [
    { key: "amenity", value: "dentist" },
    { key: "healthcare", value: "dentist" },
  ],
  plumber: [{ key: "craft", value: "plumber" }],
  plumbers: [{ key: "craft", value: "plumber" }],
  plumbing: [{ key: "craft", value: "plumber" }],
  electrician: [{ key: "craft", value: "electrician" }],
  electricians: [{ key: "craft", value: "electrician" }],
  /** common misspelling */
  electricans: [{ key: "craft", value: "electrician" }],
  salon: [{ key: "shop", value: "hairdresser" }],
  hair: [{ key: "shop", value: "hairdresser" }],
  barber: [{ key: "shop", value: "hairdresser" }],
  gym: [{ key: "leisure", value: "fitness_centre" }],
  fitness: [{ key: "leisure", value: "fitness_centre" }],
  lawyer: [{ key: "office", value: "lawyer" }],
  attorneys: [{ key: "office", value: "lawyer" }],
  legal: [{ key: "office", value: "lawyer" }],
  "real estate": [{ key: "office", value: "estate_agent" }],
  realtor: [{ key: "office", value: "estate_agent" }],
  roof: [{ key: "craft", value: "roofer" }],
  roofer: [{ key: "craft", value: "roofer" }],
  roofing: [{ key: "craft", value: "roofer" }],
  hvac: [{ key: "shop", value: "hvac" }],
  contractor: [
    { key: "craft", value: "builder" },
    { key: "office", value: "construction_company" },
  ],
  landscap: [{ key: "craft", value: "gardener" }],
  landscaping: [{ key: "craft", value: "gardener" }],
  auto: [{ key: "shop", value: "car_repair" }],
  mechanic: [{ key: "shop", value: "car_repair" }],
  veterinary: [{ key: "amenity", value: "veterinary" }],
  vet: [{ key: "amenity", value: "veterinary" }],
  chiropractor: [{ key: "healthcare", value: "chiropractor" }],
  spa: [{ key: "leisure", value: "spa" }],
  hotel: [{ key: "tourism", value: "hotel" }],
  motel: [{ key: "tourism", value: "motel" }],
  bakery: [{ key: "shop", value: "bakery" }],
  florist: [{ key: "shop", value: "florist" }],
  pharmacy: [{ key: "amenity", value: "pharmacy" }],
  insurance: [{ key: "office", value: "insurance" }],
  accountant: [{ key: "office", value: "accountant" }],
  tattoo: [{ key: "shop", value: "tattoo" }],
  photographer: [{ key: "craft", value: "photographer" }],
};

function normalizeNicheKey(niche: string): string {
  return niche.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Returns unique OSM tag filters for Overpass (union). */
export function nicheToOsmTagFilters(niche: string): OsmTagFilter[] {
  const key = normalizeNicheKey(niche);
  const direct = NICHE_ALIASES[key];
  if (direct?.length) return dedupeFilters(direct);

  const merged: OsmTagFilter[] = [];
  for (const [alias, tags] of Object.entries(NICHE_ALIASES)) {
    if (key.includes(alias) || alias.includes(key)) {
      merged.push(...tags);
    }
  }
  if (merged.length) return dedupeFilters(merged);

  // Token fallback: pick first matching token
  const tokens = key.split(/[^a-z0-9]+/).filter(Boolean);
  for (const t of tokens) {
    const hit = NICHE_ALIASES[t];
    if (hit?.length) return dedupeFilters(hit);
  }

  // Unknown niche: skip OSM bulk pull (search provider / domain discovery still run)
  return [];
}

function dedupeFilters(tags: OsmTagFilter[]): OsmTagFilter[] {
  const seen = new Set<string>();
  const out: OsmTagFilter[] = [];
  for (const t of tags) {
    const k = `${t.key}=${t.value}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

import { nicheToOsmTagFilters } from "./category-to-osm-tags";
import type { RawLead } from "./types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export type OsmDiscoverParams = {
  niche: string;
  city: string;
  /** Approx miles to pad bbox; optional */
  radiusMiles?: number | null;
};

type NominatimHit = {
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string];
};

function padBbox(
  south: number,
  west: number,
  north: number,
  east: number,
  miles: number | null | undefined,
): [number, number, number, number] {
  if (!miles || miles <= 0) return [south, west, north, east];
  const padLat = miles / 69;
  const midLat = (south + north) / 2;
  const padLon = miles / (69 * Math.max(0.2, Math.cos((midLat * Math.PI) / 180)));
  return [south - padLat, west - padLon, north + padLat, east + padLon];
}

async function nominatimSearch(city: string): Promise<NominatimHit | null> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", city);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "LocalLeadAI/1.0 (lead discovery; contact: support@locallead.ai)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as NominatimHit[];
  return data?.[0] ?? null;
}

function bboxFromHit(hit: NominatimHit, radiusMiles?: number | null): [number, number, number, number] | null {
  if (hit.boundingbox && hit.boundingbox.length === 4) {
    const [south, north, west, east] = hit.boundingbox.map(Number);
    if ([south, north, west, east].every((n) => Number.isFinite(n))) {
      return padBbox(south, west, north, east, radiusMiles);
    }
  }
  const lat = Number(hit.lat);
  const lon = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const d = 0.08;
  return padBbox(lat - d, lon - d, lat + d, lon + d, radiusMiles);
}

function buildOverpassQuery(tags: { key: string; value: string }[], bbox: [number, number, number, number]): string {
  const [south, west, north, east] = bbox;
  const parts: string[] = [];
  for (const t of tags) {
    parts.push(`node["${t.key}"="${t.value}"](${south},${west},${north},${east});`);
    parts.push(`way["${t.key}"="${t.value}"](${south},${west},${north},${east});`);
    parts.push(`relation["${t.key}"="${t.value}"](${south},${west},${north},${east});`);
  }
  return `
    [out:json][timeout:90];
    (
      ${parts.join("\n")}
    );
    out center tags 499;
  `;
}

function tagsToAddress(tags: Record<string, string>): string {
  const street = tags["addr:housenumber"] && tags["addr:street"]
    ? `${tags["addr:housenumber"]} ${tags["addr:street"]}`
    : tags["addr:street"] ?? "";
  const city = tags["addr:city"] ?? tags["addr:place"] ?? "";
  const state = tags["addr:state"] ?? "";
  const zip = tags["addr:postcode"] ?? "";
  return [street, city, state, zip].filter(Boolean).join(", ");
}

/**
 * Discover businesses from OpenStreetMap via Overpass (free).
 */
export async function discoverFromOpenStreetMap(params: OsmDiscoverParams): Promise<RawLead[]> {
  const tags = nicheToOsmTagFilters(params.niche);
  if (tags.length === 0) return [];

  const hit = await nominatimSearch(params.city);
  if (!hit) return [];
  const bbox = bboxFromHit(hit, params.radiusMiles ?? null);
  if (!bbox) return [];

  const q = buildOverpassQuery(tags, bbox);
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: `data=${encodeURIComponent(q)}`,
    signal: AbortSignal.timeout(95_000),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { elements?: Record<string, unknown>[] };
  const elements = json.elements ?? [];
  const out: RawLead[] = [];

  for (const el of elements) {
    const tags = (el.tags ?? {}) as Record<string, string>;
    const name = tags.name ?? tags.brand;
    if (!name) continue;

    let lat: number | undefined;
    let lon: number | undefined;
    if (el.type === "node") {
      lat = el.lat as number | undefined;
      lon = el.lon as number | undefined;
    } else if (el.center && typeof el.center === "object") {
      const c = el.center as { lat?: number; lon?: number };
      lat = c.lat;
      lon = c.lon;
    }
    const addr = tagsToAddress(tags);
    const city = tags["addr:city"] ?? tags["addr:place"] ?? "";
    const state = tags["addr:state"] ?? "";

    out.push({
      source: "openstreetmap",
      sourceUrl: lat != null && lon != null ? `https://www.openstreetmap.org/${String(el.type)}/${String(el.id)}` : undefined,
      name,
      category: params.niche,
      phone: tags.phone ?? tags["contact:phone"] ?? undefined,
      address: addr || undefined,
      city: city || undefined,
      state: state || undefined,
      websiteUrl: tags.website ?? tags["contact:website"] ?? undefined,
      rawData: { osmId: el.id, osmType: el.type, lat, lon, tags },
    });
  }

  return out;
}

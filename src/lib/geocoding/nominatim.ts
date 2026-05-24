/** OpenStreetMap Nominatim helpers (use via server API routes). */

export type NominatimPlace = {
  place_id: number;
  display_name: string;
  lat: number;
  lon: number;
  /** [south, north, west, east] */
  boundingbox: [number, number, number, number];
  type: string;
  class: string;
  importance?: number;
};

type RawResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: string[];
  type?: string;
  class?: string;
  importance?: number;
};

const USER_AGENT = "LeadForge/1.0 (campaign location picker)";

function parseBbox(raw: string[] | undefined): [number, number, number, number] | null {
  if (!raw || raw.length < 4) return null;
  const south = Number(raw[0]);
  const north = Number(raw[1]);
  const west = Number(raw[2]);
  const east = Number(raw[3]);
  if (![south, north, west, east].every(Number.isFinite)) return null;
  return [south, north, west, east];
}

function toPlace(r: RawResult): NominatimPlace | null {
  const lat = Number(r.lat);
  const lon = Number(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  let bbox = parseBbox(r.boundingbox);
  if (!bbox) {
    const d = 0.08;
    bbox = [lat - d, lat + d, lon - d, lon + d];
  }
  return {
    place_id: r.place_id,
    display_name: r.display_name,
    lat,
    lon,
    boundingbox: bbox,
    type: r.type ?? "",
    class: r.class ?? "",
    importance: r.importance,
  };
}

export async function searchPlaces(query: string, limit = 6): Promise<NominatimPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return [];

  const data = (await res.json()) as RawResult[];
  return data.map(toPlace).filter((p): p is NominatimPlace => p != null);
}

export async function reverseGeocode(lat: number, lon: number): Promise<NominatimPlace | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return null;

  const r = (await res.json()) as RawResult;
  return toPlace(r);
}

/** Shorter label for campaign storage (city, state, country). */
export function shortenDisplayName(full: string): string {
  const parts = full.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 3) return full;
  return parts.slice(0, 3).join(", ");
}

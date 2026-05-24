/** Dedupe raw scraper rows before normalization (place_id → link → cid). */

export function listingDedupeKey(row: Record<string, unknown>): string | null {
  const placeId = row.place_id ?? row.placeId ?? row.input_id;
  if (typeof placeId === "string" && placeId.trim()) return `place:${placeId.trim()}`;
  if (typeof placeId === "number" && Number.isFinite(placeId)) return `place:${placeId}`;

  const link = row.link ?? row.url ?? row.google_maps_url;
  if (typeof link === "string" && link.trim()) return `link:${link.trim().toLowerCase()}`;

  const cid = row.cid;
  if (typeof cid === "string" && cid.trim()) return `cid:${cid.trim()}`;
  if (typeof cid === "number" && Number.isFinite(cid)) return `cid:${cid}`;

  return null;
}

export function dedupeRawListings(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>();
  const fallback: Record<string, unknown>[] = [];

  for (const row of rows) {
    const key = listingDedupeKey(row);
    if (!key) {
      fallback.push(row);
      continue;
    }
    if (!map.has(key)) map.set(key, row);
  }

  return [...map.values(), ...fallback];
}

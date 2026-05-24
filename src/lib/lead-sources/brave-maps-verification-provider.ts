import { isWebSearchConfigured, webSearch } from "./web-search";
import type { RawLead } from "./types";

function extractGoogleMapsUrl(urls: string[]): string | null {
  for (const raw of urls) {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      continue;
    }
    const host = u.hostname.toLowerCase();
    const path = `${u.pathname}${u.search}`.toLowerCase();
    if (host === "maps.app.goo.gl" || (host.endsWith("goo.gl") && path.includes("maps"))) return raw;
    if (host.includes("google.") && (path.includes("/maps") || host.startsWith("maps.google"))) return raw;
  }
  return null;
}

/**
 * Find a public Google Maps URL for the business using Brave web search (no Google Places API).
 */
export async function verifyBusinessMapListingViaBrave(input: {
  name: string;
  city: string;
}): Promise<RawLead | null> {
  if (!isWebSearchConfigured()) return null;
  const { name, city } = input;
  const seenUrl = new Set<string>();
  const queries = [`"${name}" ${city} google maps`, `${name} ${city} site:google.com/maps`];

  for (const q of queries) {
    const pages = await webSearch(q, 12);
    const urls: string[] = [];
    for (const p of pages) {
      if (!p.url || seenUrl.has(p.url)) continue;
      seenUrl.add(p.url);
      urls.push(p.url);
    }
    const mapsUrl = extractGoogleMapsUrl(urls);
    if (mapsUrl) {
      return {
        source: "brave_maps_listing_verify",
        sourceUrl: mapsUrl,
        googleMapsUrl: mapsUrl,
        name,
        address: city,
        rawData: { braveQuery: q, mapsUrl },
      };
    }
  }

  return null;
}

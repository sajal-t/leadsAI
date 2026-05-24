import { buildScrapeQueries } from "@/lib/lead-discovery/build-scrape-queries";
import { dedupeRawListings } from "@/lib/lead-discovery/dedupe-listings";
import { DEFAULT_SAMPLE_SIZE, resolveScrapeLimit } from "@/lib/sample-size";
import type { LeadCandidate } from "../types";
import { MapsScraperError, runGoogleMapsScraperCli } from "./google-maps-scraper-cli";
import { runGoogleMapsScraperDocker } from "./google-maps-scraper-docker";

export { MapsScraperError };

function pickString(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

function pickNumber(row: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function normalizeRow(row: Record<string, unknown>, niche: string): LeadCandidate | null {
  const name =
    pickString(row, ["title", "name", "Title", "Name", "business_name"]) ?? "";
  if (!name || name.length < 2) return null;

  const websiteUrl =
    pickString(row, ["web_site", "website", "webSite", "Website", "site"]) ?? null;

  const googleMapsUrl =
    pickString(row, ["url", "link", "google_maps_url", "maps_url", "googleMapsUrl", "place_url"]) ?? null;

  return {
    name: name.slice(0, 500),
    websiteUrl: websiteUrl || null,
    phone: pickString(row, ["phone", "phoneNumber", "Phone"]) ?? null,
    address: pickString(row, ["address", "Address", "full_address"]) ?? null,
    category: pickString(row, ["category", "Category", "type"]) ?? niche,
    rating: pickNumber(row, ["rating", "Rating", "stars"]) ?? null,
    reviewCount: pickNumber(row, ["review_count", "reviewCount", "reviews", "user_ratings_total"]) ?? null,
    latitude: pickNumber(row, ["latitude", "lat", "Latitude"]) ?? null,
    longitude: pickNumber(row, ["longitude", "lon", "lng", "Longitude"]) ?? null,
    googleMapsUrl: googleMapsUrl || null,
    source: "google_maps_scraper",
    rawData: row,
  };
}

function dedupeCandidates(leads: LeadCandidate[]): LeadCandidate[] {
  const map = new Map<string, LeadCandidate>();
  for (const L of leads) {
    const key = `${L.name.toLowerCase()}|${(L.phone ?? "").toLowerCase()}|${(L.address ?? "").toLowerCase()}`;
    const ex = map.get(key);
    if (!ex) {
      map.set(key, L);
    } else {
      map.set(key, {
        ...ex,
        websiteUrl: ex.websiteUrl || L.websiteUrl,
        googleMapsUrl: ex.googleMapsUrl || L.googleMapsUrl,
        phone: ex.phone || L.phone,
        address: ex.address || L.address,
        rating: ex.rating ?? L.rating,
        reviewCount: ex.reviewCount ?? L.reviewCount,
      });
    }
  }
  return [...map.values()];
}

export function getMapsScraperConfig(): {
  enabled: boolean;
  mode: "cli" | "docker";
  binaryConfigured: boolean;
  dockerEnabled: boolean;
} {
  const enabled = process.env.MAPS_SCRAPER_ENABLED === "true";
  const dockerEnabled = process.env.MAPS_SCRAPER_DOCKER_ENABLED === "true";
  const mode =
    (process.env.MAPS_SCRAPER_MODE ?? "cli").toLowerCase() === "docker" || dockerEnabled ? "docker" : "cli";
  return {
    enabled,
    mode: dockerEnabled ? "docker" : mode,
    binaryConfigured: Boolean(process.env.MAPS_SCRAPER_BIN?.trim()),
    dockerEnabled,
  };
}

/**
 * Run external google-maps-scraper and return normalized LocalLead candidates.
 */
export async function discoverWithGoogleMapsScraper({
  query,
  niche,
  city,
  deepSearch = false,
  sampleSize,
  jobId,
}: {
  query: string;
  niche: string;
  city: string;
  deepSearch?: boolean;
  sampleSize?: number;
  jobId?: string;
}): Promise<LeadCandidate[]> {
  const cfg = getMapsScraperConfig();
  if (!cfg.enabled) {
    throw new MapsScraperError("MAPS_SCRAPER_ENABLED is not true");
  }

  const id = jobId ?? `job-${Date.now()}`;
  const useDocker = cfg.dockerEnabled || cfg.mode === "docker";
  const scrapeQueries = buildScrapeQueries(niche, city, { deepSearch });
  const depth = deepSearch ? 10 : undefined;

  let rawRows: Record<string, unknown>[];
  if (useDocker) {
    if (!process.env.MAPS_SCRAPER_DOCKER_IMAGE?.trim()) {
      throw new MapsScraperError("MAPS_SCRAPER_DOCKER_ENABLED requires MAPS_SCRAPER_DOCKER_IMAGE");
    }
    rawRows = await runGoogleMapsScraperDocker({ queries: scrapeQueries, jobId: id, depth });
  } else {
    if (!cfg.binaryConfigured) {
      throw new MapsScraperError("Missing MAPS_SCRAPER_BIN");
    }
    rawRows = await runGoogleMapsScraperCli({ queries: scrapeQueries, jobId: id, depth });
  }

  const limit = resolveScrapeLimit(
    typeof sampleSize === "number" && Number.isFinite(sampleSize) ? sampleSize : DEFAULT_SAMPLE_SIZE,
    deepSearch,
  );

  const dedupedRows = dedupeRawListings(rawRows);

  const normalized = dedupedRows
    .map((row) => normalizeRow(row, niche))
    .filter((r): r is LeadCandidate => r != null);

  const deduped = dedupeCandidates(normalized).slice(0, limit);

  for (const lead of deduped) {
    lead.rawData = {
      ...lead.rawData,
      scraperQuery: query,
      scraperQueries: scrapeQueries,
      deepSearch,
      niche,
      city,
    };
  }

  return deduped;
}

import {
  activeWebSearchProvider,
  fetchSerperOrganicDiscovery,
  fetchSerperPlacesForMapsQuery,
  webSearch,
  type WebSearchHit,
} from "./web-search";
import { generateMapsPlacesQueries, generateSerpQueries } from "./search-query-generator";
import type { ClassifiedSerpHit, RawLead, SerpResultKind } from "./types";
import { classifyUrlKind, isGoogleMapsWebUrl, isRealBusinessWebsite } from "./website-detection";

function kindFromHost(url: string): SerpResultKind {
  if (isGoogleMapsWebUrl(url)) return "google_maps";
  const k = classifyUrlKind(url);
  if (k === "social") {
    if (url.includes("instagram.com")) return "instagram";
    if (url.includes("tiktok.com")) return "tiktok";
    return "facebook";
  }
  if (k === "directory") {
    if (url.includes("yelp.com")) return "yelp";
    return "directory";
  }
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (host.includes("chamber")) return "chamber";
  if (host.endsWith(".gov") || host.includes(".gov.")) return "government";
  return "website";
}

function cleanSerpTitle(title: string): string {
  return (title.split("|")[0]?.split(" - ")[0] ?? title).trim().slice(0, 200) || "Unknown business";
}

function rawLeadSourceFromHit(p: WebSearchHit): string {
  if (p.fromMapsPlaces) return "serper_places";
  return `${p.source}_web_serp`;
}

function isSiteOperatorQuery(q: string): boolean {
  return /\bsite:/i.test(q);
}

/**
 * Lead discovery from web search.
 * With Serper: runs like “open Maps, type Electricians in Bothell, WA” — `/places` only for those phrases,
 * then optional filtered organic queries (no `site:` sent to Maps). We do not automate google.com/maps in a browser.
 */
export async function discoverFromSearchSerp(niche: string, city: string, maxQueries = 8): Promise<{
  rawLeads: RawLead[];
  hits: ClassifiedSerpHit[];
  queriesTried: string[];
}> {
  const hits: ClassifiedSerpHit[] = [];
  const rawLeads: RawLead[] = [];
  const seenUrl = new Set<string>();
  const queriesTried: string[] = [];

  function ingestPages(pages: WebSearchHit[], q: string): void {
    for (const p of pages) {
      const url = p.url.trim();
      const title = p.title.trim();
      const snippet = p.snippet.trim();
      if (!url || seenUrl.has(url)) continue;
      seenUrl.add(url);
      const kind = p.fromMapsPlaces ? ("google_maps" as const) : kindFromHost(url);
      hits.push({ title, url, snippet, kind });

      const name = cleanSerpTitle(title);
      const base: RawLead = {
        source: rawLeadSourceFromHit(p),
        sourceUrl: url,
        name,
        category: niche,
        address: snippet.slice(0, 400),
        rawData: { query: q, kind, snippet, searchProvider: p.source, fromMapsPlaces: Boolean(p.fromMapsPlaces) },
      };

      if (p.fromMapsPlaces) {
        const www = p.placeWebsite?.trim();
        let websiteUrl: string | undefined;
        if (www && isRealBusinessWebsite(www)) {
          websiteUrl = www.startsWith("http") ? www : `https://${www}`;
        }
        rawLeads.push({
          ...base,
          googleMapsUrl: url,
          websiteUrl,
          phone: p.placePhone?.trim() || undefined,
          rating: p.placeRating,
          reviewCount: p.placeRatingCount,
        });
      } else if (kind === "google_maps") {
        rawLeads.push({
          ...base,
          source: `${p.source}_maps_serp`,
          googleMapsUrl: url,
        });
      } else if (kind === "website" || kind === "government") {
        rawLeads.push({ ...base, websiteUrl: url });
      } else if (kind === "facebook" || kind === "instagram" || kind === "tiktok") {
        rawLeads.push({ ...base, socialUrls: [url] });
      } else if (kind === "yelp" || kind === "directory" || kind === "chamber") {
        rawLeads.push({ ...base, websiteUrl: url });
      }
    }
  }

  const provider = activeWebSearchProvider();

  if (provider === "serper") {
    const mapsBudget = Math.min(6, Math.max(1, maxQueries));
    const mapsQs = generateMapsPlacesQueries(niche, city).slice(0, mapsBudget);
    for (const q of mapsQs) {
      queriesTried.push(q);
      const pages = await fetchSerperPlacesForMapsQuery(q, 15);
      ingestPages(pages, q);
    }
    const leftover = maxQueries - queriesTried.length;
    if (leftover > 0) {
      const triedSet = new Set(queriesTried);
      const webQs = generateSerpQueries(niche, city)
        .filter((q) => !isSiteOperatorQuery(q))
        .filter((q) => !triedSet.has(q));
      for (const q of webQs.slice(0, leftover)) {
        queriesTried.push(q);
        const pages = await fetchSerperOrganicDiscovery(q, 12);
        ingestPages(pages, q);
      }
    }
  } else {
    const queries = generateSerpQueries(niche, city).slice(0, maxQueries);
    for (const q of queries) {
      queriesTried.push(q);
      const pages = await webSearch(q, 15);
      ingestPages(pages, q);
    }
  }

  return { rawLeads, hits, queriesTried };
}

import { braveWebSearch } from "./brave-web-search";

export type WebSearchProviderId = "serper" | "tavily" | "brave";

/** Normalized hit from any configured search backend. */
export type WebSearchHit = {
  title: string;
  url: string;
  snippet: string;
  source: WebSearchProviderId;
  /** Serper `POST /places` row — Maps-backed business, not a generic web article */
  fromMapsPlaces?: boolean;
  placeWebsite?: string;
  placePhone?: string;
  placeRating?: number;
  placeRatingCount?: number;
};

/** Round-up / directory hosts that dominate generic “electricians in …” organic results. */
const LISTICLE_OR_DIRECTORY_HOST_FRAGMENTS = [
  "yelp.com",
  "angi.com",
  "homeadvisor.com",
  "thumbtack.com",
  "yellowpages.com",
  "nextdoor.com",
  "bbb.org",
  "superpages.com",
  "porch.com",
  "bark.com",
  "houzz.com",
  "linkedin.com",
  "manta.com",
  "chamberofcommerce.com",
  "mapquest.com",
];

function hostOfUrl(url: string): string {
  try {
    return new URL(url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`)
      .hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function isAggressiveDirectoryOrListicleUrl(url: string): boolean {
  const host = hostOfUrl(url);
  if (!host) return false;
  return LISTICLE_OR_DIRECTORY_HOST_FRAGMENTS.some((frag) => host === frag || host.endsWith(`.${frag}`));
}

function dedupeHitsByUrl(hits: WebSearchHit[]): WebSearchHit[] {
  const seen = new Set<string>();
  const out: WebSearchHit[] = [];
  for (const h of hits) {
    const u = h.url.trim();
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(h);
  }
  return out;
}

/** Keep Maps/Places rows; drop SEO roundups and mega-directories from generic organic. */
function filterOrganicNoise(hits: WebSearchHit[]): WebSearchHit[] {
  return hits.filter((h) => h.fromMapsPlaces === true || !isAggressiveDirectoryOrListicleUrl(h.url));
}

type SerperPlace = {
  title?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  ratingCount?: number;
  category?: string;
  phoneNumber?: string;
  website?: string;
  cid?: string | number;
};

function mapsUrlFromSerperPlace(p: SerperPlace): string {
  const cid = p.cid != null && p.cid !== "" ? String(p.cid).trim() : "";
  if (cid) return `https://www.google.com/maps?cid=${encodeURIComponent(cid)}`;
  const { latitude: lat, longitude: lon } = p;
  if (typeof lat === "number" && typeof lon === "number" && Number.isFinite(lat) && Number.isFinite(lon)) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`;
  }
  const title = (p.title ?? "").trim();
  const addr = (p.address ?? "").trim();
  if (title && addr) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${title} ${addr}`)}`;
  }
  return "";
}

async function serperPlacesHits(query: string, limit: number): Promise<WebSearchHit[]> {
  const key = process.env.SERPER_API_KEY?.trim();
  if (!key) return [];
  const gl = (process.env.SERPER_GL ?? "us").trim() || "us";
  const safeLimit = Math.min(20, Math.max(1, Math.floor(limit)));
  try {
    const res = await fetch("https://google.serper.dev/places", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": key },
      body: JSON.stringify({ q: query, gl, num: safeLimit }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn("[web-search/serper/places]", res.status, detail.slice(0, 300));
      return [];
    }
    const json = (await res.json()) as { places?: SerperPlace[] };
    const places = json.places ?? [];
    const out: WebSearchHit[] = [];
    for (const p of places.slice(0, safeLimit)) {
      const title = (p.title ?? "").trim();
      const mapsUrl = mapsUrlFromSerperPlace(p);
      if (!title || !mapsUrl) continue;
      const website = (p.website ?? "").trim();
      const phone = (p.phoneNumber ?? "").trim();
      const addr = (p.address ?? "").trim();
      const parts = [addr, phone, website, p.category].filter(Boolean) as string[];
      const snippet = parts.join(" · ").slice(0, 500);
      out.push({
        title,
        url: mapsUrl,
        snippet: snippet || addr,
        source: "serper",
        fromMapsPlaces: true,
        placeWebsite: website || undefined,
        placePhone: phone || undefined,
        placeRating: typeof p.rating === "number" ? p.rating : undefined,
        placeRatingCount: typeof p.ratingCount === "number" ? p.ratingCount : undefined,
      });
    }
    return out;
  } catch (e) {
    console.warn("[web-search/serper/places]", e instanceof Error ? e.message : e);
    return [];
  }
}

async function serperOrganicHits(query: string, limit: number): Promise<WebSearchHit[]> {
  const key = process.env.SERPER_API_KEY?.trim();
  if (!key) return [];
  const safeLimit = Math.min(20, Math.max(1, Math.floor(limit)));
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": key },
      body: JSON.stringify({ q: query, num: safeLimit }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn("[web-search/serper]", res.status, detail.slice(0, 300));
      return [];
    }
    const json = (await res.json()) as {
      organic?: Array<{ title?: string; link?: string; snippet?: string }>;
    };
    const organic = json.organic ?? [];
    return organic
      .map((r) => ({
        title: (r.title ?? "").trim(),
        url: (r.link ?? "").trim(),
        snippet: (r.snippet ?? "").trim(),
        source: "serper" as const,
      }))
      .filter((r) => r.url.length > 0);
  } catch (e) {
    console.warn("[web-search/serper]", e instanceof Error ? e.message : e);
    return [];
  }
}

/**
 * Serper: Google Maps–style `/places` first, then a thin slice of filtered organic web results.
 */
async function serperWebSearch(query: string, count: number): Promise<WebSearchHit[]> {
  const cap = Math.min(20, Math.max(1, Math.floor(count)));
  const placesBudget = Math.min(cap, 15);
  const organicBudget = Math.min(10, Math.max(4, Math.ceil(cap / 3)));

  const places = await serperPlacesHits(query, placesBudget);
  const organic = await serperOrganicHits(query, organicBudget);
  const merged = dedupeHitsByUrl([...places, ...organic]);
  return filterOrganicNoise(merged);
}

async function tavilyWebSearch(query: string, count: number): Promise<WebSearchHit[]> {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) return [];
  const safeCount = Math.min(20, Math.max(1, Math.floor(count)));
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query,
        max_results: safeCount,
        search_depth: "basic",
        include_answer: false,
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn("[web-search/tavily]", res.status, detail.slice(0, 300));
      return [];
    }
    const json = (await res.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };
    const results = json.results ?? [];
    const hits = results
      .map((r) => ({
        title: (r.title ?? "").trim(),
        url: (r.url ?? "").trim(),
        snippet: (r.content ?? "").trim(),
        source: "tavily" as const,
      }))
      .filter((r) => r.url.length > 0);
    return filterOrganicNoise(hits);
  } catch (e) {
    console.warn("[web-search/tavily]", e instanceof Error ? e.message : e);
    return [];
  }
}

async function braveAsWebSearch(query: string, count: number): Promise<WebSearchHit[]> {
  const hits = await braveWebSearch(query, count);
  const mapped = hits.map((h) => ({
    title: h.title,
    url: h.url,
    snippet: h.snippet,
    source: "brave" as const,
  }));
  return filterOrganicNoise(mapped);
}

function hasKeys(): { serper: boolean; tavily: boolean; brave: boolean } {
  return {
    serper: Boolean(process.env.SERPER_API_KEY?.trim()),
    tavily: Boolean(process.env.TAVILY_API_KEY?.trim()),
    brave: Boolean(process.env.BRAVE_SEARCH_API_KEY?.trim()),
  };
}

function pickAuto(keys: ReturnType<typeof hasKeys>): WebSearchProviderId | null {
  if (keys.serper) return "serper";
  if (keys.tavily) return "tavily";
  if (keys.brave) return "brave";
  return null;
}

/**
 * Active web search backend. `WEB_SEARCH_PROVIDER`: auto (default) | serper | tavily | brave.
 * Auto prefers Serper (Maps `/places` + filtered organic), then Tavily, then Brave.
 */
export function activeWebSearchProvider(): WebSearchProviderId | null {
  const pref = (process.env.WEB_SEARCH_PROVIDER ?? "auto").toLowerCase().trim();
  const keys = hasKeys();

  if (pref === "serper") return keys.serper ? "serper" : pickAuto(keys);
  if (pref === "tavily") return keys.tavily ? "tavily" : pickAuto(keys);
  if (pref === "brave") return keys.brave ? "brave" : pickAuto(keys);
  return pickAuto(keys);
}

export function isWebSearchConfigured(): boolean {
  return activeWebSearchProvider() !== null;
}

/**
 * Serper `POST /places` only — same data you’d scroll in Google Maps, without driving a browser on google.com/maps.
 * Pass natural phrases only (e.g. “Electricians in Bothell, WA”).
 */
export async function fetchSerperPlacesForMapsQuery(query: string, limit = 15): Promise<WebSearchHit[]> {
  if (!process.env.SERPER_API_KEY?.trim()) return [];
  return serperPlacesHits(query, limit);
}

/**
 * Serper Google web organic only (filtered listicles). Does not call `/places`.
 */
export async function fetchSerperOrganicDiscovery(query: string, limit = 12): Promise<WebSearchHit[]> {
  if (!process.env.SERPER_API_KEY?.trim()) return [];
  const organic = await serperOrganicHits(query, limit);
  return filterOrganicNoise(organic);
}

export async function webSearch(query: string, count = 10): Promise<WebSearchHit[]> {
  const p = activeWebSearchProvider();
  if (!p) return [];
  if (p === "serper") return serperWebSearch(query, count);
  if (p === "tavily") return tavilyWebSearch(query, count);
  return braveAsWebSearch(query, count);
}

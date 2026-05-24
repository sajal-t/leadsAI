import type { SupabaseClient } from "@supabase/supabase-js";
import { webSearch } from "./web-search";
import { cacheGetJson, cacheSetJson, cacheKeyParts } from "./cache";
import { isRealBusinessWebsite } from "./website-detection";

export type DomainDiscoveryInput = {
  name: string;
  city: string;
  phone?: string | null;
  /** Listing / seed URL from maps or other provider */
  seedWebsiteUrl?: string | null;
  /**
   * When false, skip Brave web search (only use cache + a clearly real seed domain).
   * Use false when the listing already shows an owned website URL.
   */
  allowBraveLookup?: boolean;
};

/**
 * Find a likely real business domain using optional Brave Web Search + optional seed URL.
 * Results are cached per business fingerprint.
 */
export async function discoverBestWebsiteUrl(
  db: SupabaseClient,
  input: DomainDiscoveryInput,
): Promise<{ url: string | null; tried: string[] }> {
  const tried: string[] = [];
  const allowBrave = input.allowBraveLookup !== false;
  const cacheKey = cacheKeyParts("domain", [
    input.name,
    input.city,
    input.phone ?? "",
    input.seedWebsiteUrl ?? "",
    allowBrave ? "brave:1" : "brave:0",
  ]);
  const cached = await cacheGetJson<{ url: string | null }>(db, cacheKey);
  if (cached && "url" in cached) return { url: cached.url, tried: ["cache"] };

  if (input.seedWebsiteUrl && isRealBusinessWebsite(input.seedWebsiteUrl)) {
    const u = input.seedWebsiteUrl.startsWith("http") ? input.seedWebsiteUrl : `https://${input.seedWebsiteUrl}`;
    await cacheSetJson(db, cacheKey, { url: u }, 14 * 24 * 60 * 60 * 1000);
    return { url: u, tried: ["seed"] };
  }

  if (!allowBrave) {
    await cacheSetJson(db, cacheKey, { url: null }, 3 * 24 * 60 * 60 * 1000);
    return { url: null, tried };
  }

  const queries = [
    `"${input.name}" "${input.city}" website`,
    `"${input.name}" "${input.city}" contact`,
    `"${input.name}" official site`,
  ];
  if (input.phone) queries.push(`"${input.phone}" business`);

  for (const q of queries) {
    tried.push(q);
    const pages = await webSearch(q, 8);
    for (const p of pages) {
      const url = p.url.trim();
      if (url && isRealBusinessWebsite(url)) {
        await cacheSetJson(db, cacheKey, { url }, 14 * 24 * 60 * 60 * 1000);
        return { url, tried };
      }
    }
  }

  await cacheSetJson(db, cacheKey, { url: null }, 3 * 24 * 60 * 60 * 1000);
  return { url: null, tried };
}

import {
  DEEP_QUERY_VARIANTS_DEFAULT,
  DEEP_QUERY_VARIANTS_MAX,
} from "@/lib/lead-discovery/search-mode";
import { generateMapsPlacesQueries } from "@/lib/lead-sources/search-query-generator";

/**
 * Build Maps search phrases for one campaign (city, state, or region).
 * Shallow: one query. Deep: several variants (one per line in scraper -input).
 */
export function buildScrapeQueries(
  niche: string,
  city: string,
  opts?: { deepSearch?: boolean },
): string[] {
  const n = niche.trim();
  const area = city.trim();
  if (!n || !area) return [];

  const primary = `${n} in ${area}`;
  if (!opts?.deepSearch) {
    return [primary];
  }

  const envN = Number(process.env.MAPS_SCRAPER_QUERY_VARIANTS?.trim());
  const variantCap =
    Number.isFinite(envN) && envN >= 1
      ? Math.min(DEEP_QUERY_VARIANTS_MAX, Math.round(envN))
      : DEEP_QUERY_VARIANTS_DEFAULT;
  const variants = generateMapsPlacesQueries(n, area);
  const regional = [`${n} near ${area}`, `${n} ${area}`];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const q of [primary, ...regional, ...variants]) {
    const t = q.replace(/\s+/g, " ").trim();
    const key = t.toLowerCase();
    if (t.length <= 4 || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }

  return out.slice(0, variantCap);
}

import { SHALLOW_REVIEW_CAP } from "@/lib/lead-discovery/search-mode";

/** Campaign lead-save target and scraper review limits. */

export const DEFAULT_SAMPLE_SIZE = 500;
export const MIN_SAMPLE_SIZE = 60;
export const MAX_SAMPLE_SIZE = 2000;

export function clampSampleSize(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_SAMPLE_SIZE;
  return Math.min(MAX_SAMPLE_SIZE, Math.max(MIN_SAMPLE_SIZE, Math.round(n)));
}

/** Listings to review from scraper (headroom above save target). */
export function reviewLimitForSampleSize(sampleSize: number, deepSearch = false): number {
  if (!deepSearch) return SHALLOW_REVIEW_CAP;
  const target = clampSampleSize(sampleSize);
  return Math.max(target * 3, target + 250);
}

export function resolveScrapeLimit(sampleSize?: number, deepSearch = false): number {
  if (!deepSearch) return SHALLOW_REVIEW_CAP;

  const envRaw = process.env.MAPS_SCRAPER_MAX_RESULTS?.trim();
  if (envRaw) {
    const envN = Number(envRaw);
    if (Number.isFinite(envN) && envN > 0) return Math.round(envN);
  }
  if (typeof sampleSize === "number" && Number.isFinite(sampleSize)) {
    return reviewLimitForSampleSize(sampleSize, true);
  }
  return reviewLimitForSampleSize(DEFAULT_SAMPLE_SIZE, true);
}

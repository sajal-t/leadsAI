/** Shallow vs deep discovery presets (CLI / Docker scraper). */

export const SHALLOW_REVIEW_CAP = 120;
export const DEEP_QUERY_VARIANTS_DEFAULT = 4;
export const DEEP_QUERY_VARIANTS_MAX = 6;

export type SearchMode = "shallow" | "deep";

export function searchModeFromDeepSearch(deepSearch: boolean): SearchMode {
  return deepSearch ? "deep" : "shallow";
}

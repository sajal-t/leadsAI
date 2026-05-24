/** User-facing copy for lead discovery — no implementation details. */

export const LEAD_SEARCH_UNAVAILABLE =
  "Lead search is temporarily unavailable. Please try again later or contact support.";

export const LEAD_SEARCH_FAILED =
  "We couldn't complete this lead search. Please try again in a few minutes.";

const INTERNAL_HINTS = [
  "maps_scraper",
  "google-maps-scraper",
  "google maps scraper",
  "maps_scraper_bin",
  "playwright",
  "gosom",
  "scraper exited",
  "scraper binary",
  "docker scraper",
  ".env.local",
];

/** Strip internal tooling details from errors shown in the app. */
export function userFacingDiscoveryError(raw?: string | null): string {
  if (!raw?.trim()) return LEAD_SEARCH_FAILED;
  const lower = raw.toLowerCase();
  if (INTERNAL_HINTS.some((h) => lower.includes(h))) return LEAD_SEARCH_FAILED;
  if (lower.includes("not enabled") || lower.includes("missing")) return LEAD_SEARCH_UNAVAILABLE;
  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
}

export function discoveryJobStepLabel(stage: string | undefined): string {
  switch (stage) {
    case "queued":
      return "Queued";
    case "scraping":
      return "Searching listings";
    case "importing":
      return "Processing results";
    case "classifying":
      return "Qualifying leads";
    case "done":
      return "Complete";
    case "error":
      return "Failed";
    default:
      return stage?.replace(/_/g, " ")?.trim() || "Starting lead search";
  }
}

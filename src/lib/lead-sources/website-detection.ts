import type { WebsiteStatus } from "./types";

const BLOCKED_HOST_SUBSTRINGS = [
  "facebook.com",
  "fb.com",
  "instagram.com",
  "tiktok.com",
  "yelp.com",
  "m.yelp.com",
  "yellowpages.com",
  "angi.com",
  "homeadvisor.com",
  "thumbtack.com",
  "bbb.org",
  "linktr.ee",
  "business.site",
  "maps.google.com",
  "google.com/maps",
  "g.page",
  "linkedin.com",
  "nextdoor.com",
  "tripadvisor.com",
  "foursquare.com",
  "mapquest.com",
  "bing.com/maps",
];

const DIRECTORY_HOST_HINTS = [
  "yelp.com",
  "yellowpages.com",
  "superpages.com",
  "manta.com",
  "chamberofcommerce.com",
  "bbb.org",
  "angi.com",
  "thumbtack.com",
];

const SOCIAL_HOST_HINTS = ["facebook.com", "fb.com", "instagram.com", "tiktok.com", "twitter.com", "x.com"];

function hostOf(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Public Google Maps listing URLs (not an owned business website). */
export function isGoogleMapsWebUrl(url: string): boolean {
  try {
    const u = new URL(url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`);
    const host = u.hostname.toLowerCase();
    const path = `${u.pathname}${u.search}`.toLowerCase();
    if (host === "maps.app.goo.gl") return true;
    if (host === "maps.google.com") return true;
    if (host.endsWith("goo.gl") && path.includes("maps")) return true;
    if ((host === "www.google.com" || host === "google.com") && path.includes("/maps")) return true;
    return false;
  } catch {
    return false;
  }
}

export function isRealBusinessWebsite(url: string): boolean {
  if (isGoogleMapsWebUrl(url)) return false;
  const host = hostOf(url);
  if (!host) return false;

  for (const b of BLOCKED_HOST_SUBSTRINGS) {
    if (host === b || host.endsWith(`.${b}`)) return false;
  }

  if (host.endsWith(".wixsite.com")) return false;
  if (host === "sites.google.com") return false;

  return true;
}

export function classifyUrlKind(url: string): "social" | "directory" | "website" {
  const host = hostOf(url);
  if (!host) return "website";
  for (const s of SOCIAL_HOST_HINTS) {
    if (host === s || host.endsWith(`.${s}`)) return "social";
  }
  for (const d of DIRECTORY_HOST_HINTS) {
    if (host === d || host.endsWith(`.${d}`)) return "directory";
  }
  if (!isRealBusinessWebsite(url)) return "directory";
  return "website";
}

export type WebsiteSignals = {
  primaryUrl: string | null;
  socialUrls: string[];
  directoryUrls: string[];
  fetchOk: boolean | null;
  /** 0–100 heuristic */
  qualityScore: number;
};

export function detectWebsiteStatus(s: WebsiteSignals): WebsiteStatus {
  const hasSocial = s.socialUrls.length > 0;
  const hasDir = s.directoryUrls.length > 0;
  const hasPrimary = Boolean(s.primaryUrl && isRealBusinessWebsite(s.primaryUrl));

  if (hasPrimary) {
    if (s.fetchOk === false) return "broken";
    if (s.fetchOk === true) return "good";
    return "unknown";
  }

  if (!s.primaryUrl && hasSocial && !hasDir) return "social_only";
  if (!s.primaryUrl && hasDir && !hasSocial) return "directory_only";
  if (!s.primaryUrl && hasSocial && hasDir) return "social_only";
  if (!s.primaryUrl && !hasSocial && !hasDir) return "none";

  return "unknown";
}

/**
 * Saved to the campaign when the business does not clearly have its own working website:
 * missing site, social/directory only, or a broken/invalid real-domain fetch.
 */
export const NO_WEBSITE_LEAD_STATUSES = new Set<string>([
  "no_website_found",
  "none",
  "NO_WEBSITE_FOUND",
  "social_only",
  "directory_only",
  "broken",
]);

/** @deprecated alias — same as NO_WEBSITE_LEAD_STATUSES */
export const PITCH_LIST_STATUSES = NO_WEBSITE_LEAD_STATUSES;

export const GOOD_SITE_STATUSES = new Set<string>(["good", "WEBSITE_FOUND", "website_found"]);

export function isNoWebsiteLeadStatus(status: string | null | undefined): boolean {
  return Boolean(status && NO_WEBSITE_LEAD_STATUSES.has(status));
}

export function isPitchListWebsiteStatus(status: string | null | undefined): boolean {
  return isNoWebsiteLeadStatus(status);
}

export function websiteStatusLabel(status: string | null | undefined): string {
  const map: Record<string, string> = {
    no_website_found: "No website found",
    none: "No website found",
    NO_WEBSITE_FOUND: "No website found",
    social_only: "Social only",
    directory_only: "Directory only",
    broken: "Broken website",
    bad: "Bad site",
    good: "Website found",
    website_found: "Website found",
    WEBSITE_FOUND: "Website found",
    unknown: "Unclear",
  };
  return map[status ?? ""] ?? (status ? status.replace(/_/g, " ") : "Unknown");
}

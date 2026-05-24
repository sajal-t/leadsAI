/** Normalized row from google-maps-scraper before persistence. */
export type LeadCandidate = {
  name: string;
  websiteUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  category?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  source: string;
  rawData?: Record<string, unknown>;
};

export type DiscoveryWebsiteStatus =
  | "no_website_found"
  | "social_only"
  | "directory_only"
  | "website_found"
  | "broken"
  | "unknown";

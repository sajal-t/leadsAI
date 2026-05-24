/** External provider row before normalization */
export type RawLead = {
  source: string;
  sourceUrl?: string;
  name: string;
  category?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  websiteUrl?: string;
  /** Google Maps listing URL when known (e.g. from SERP), not the Places API */
  googleMapsUrl?: string;
  /** Google Place resource id (used for stable place_id in DB) */
  googlePlaceId?: string;
  socialUrls?: string[];
  rating?: number;
  reviewCount?: number;
  rawData?: Record<string, unknown>;
};

export type WebsiteStatus =
  | "none"
  | "social_only"
  | "directory_only"
  | "broken"
  | "bad"
  | "good"
  | "unknown";

/** Normalized lead ready for persistence (id assigned at insert) */
export type BusinessLead = {
  id: string;
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  websiteUrl: string | null;
  hasRealWebsite: boolean;
  websiteStatus: WebsiteStatus;
  websiteQualityScore: number;
  leadScore: number;
  leadReason: string;
  source: string;
  sourceUrl: string | null;
  createdAt: Date;
};

/** Discovery job filters (reserved; pipeline does not use score filters). */
export type DiscoveryFilters = Record<string, never>;

export type DiscoveryJobMeta = {
  queriesExecuted?: string[];
  sourcesUsed?: string[];
  note?: string;
};

export type SerpResultKind =
  | "website"
  | "google_maps"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "yelp"
  | "directory"
  | "chamber"
  | "government"
  | "unknown";

export type ClassifiedSerpHit = {
  title: string;
  url: string;
  snippet: string;
  kind: SerpResultKind;
};

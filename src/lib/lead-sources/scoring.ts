import type { WebsiteStatus } from "./types";

export type ScoreInput = {
  websiteStatus: WebsiteStatus;
  hasPhone: boolean;
  hasEmail: boolean;
  rating?: number | null;
  reviewCount?: number | null;
  category?: string | null;
  hasContactForm?: boolean;
  hasBookingLink?: boolean;
  weakSeoMeta?: boolean;
};

export function computeLeadScore(input: ScoreInput): number {
  let score = 0;
  const ws = input.websiteStatus;

  if (ws === "none") score += 40;
  else if (ws === "social_only") score += 35;
  else if (ws === "directory_only") score += 30;
  else if (ws === "broken") score += 35;
  else if (ws === "bad") score += 25;
  else if (ws === "good") score += 0;

  if (!input.hasContactForm && ws !== "none" && ws !== "social_only" && ws !== "directory_only") score += 10;
  if (!input.hasBookingLink && ws !== "none" && ws !== "social_only" && ws !== "directory_only") score += 10;
  if (input.weakSeoMeta && ws !== "none" && ws !== "social_only" && ws !== "directory_only") score += 10;

  if (input.hasPhone) score += 10;
  if (input.hasEmail) score += 15;

  const cat = (input.category ?? "").toLowerCase();
  if (
    cat &&
    /plumb|electric|roof|hvac|landscap|dent|legal|law|restaurant|salon|gym|fitness|auto|repair|contractor/.test(cat)
  ) {
    score += 10;
  }

  const reviews = input.reviewCount ?? 0;
  const rating = input.rating ?? 0;
  if (reviews >= 10 && rating >= 4) score += 10;
  else if (reviews >= 5 && rating >= 3.5) score += 5;

  return Math.min(100, Math.round(score));
}

export function buildLeadReason(input: ScoreInput): string {
  const parts: string[] = [];
  const ws = input.websiteStatus;

  if (ws === "none") parts.push("No real website found for this business in public listings.");
  if (ws === "social_only")
    parts.push("Business appears to rely primarily on social profiles instead of a dedicated site.");
  if (ws === "directory_only")
    parts.push("Directory-only presence found; no convincing custom domain detected.");
  if (ws === "broken") parts.push("Website exists but failed to load or had SSL/network errors — possible redesign opportunity.");
  if (ws === "bad")
    parts.push("Website exists but looks thin, outdated, or missing clear contact/booking flows.");
  if (ws === "good") parts.push("Solid web presence detected — lower urgency for a new site pitch.");

  if (input.weakSeoMeta && ws !== "none" && ws !== "social_only" && ws !== "directory_only")
    parts.push("Weak or missing SEO metadata.");
  if (!input.hasContactForm && ws !== "none" && ws !== "social_only" && ws !== "directory_only")
    parts.push("No obvious contact form on scanned pages.");
  if (!input.hasBookingLink && ws !== "none" && ws !== "social_only" && ws !== "directory_only")
    parts.push("No online booking link detected.");

  if (parts.length === 0) return "Mixed signals — review manually before pitching.";
  return parts.join(" ");
}

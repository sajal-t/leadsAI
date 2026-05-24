import { isRealBusinessWebsite } from "@/lib/lead-sources/website-detection";

/**
 * True only when the Google Maps listing shows a real owned business domain.
 * Empty, social, directory, and Maps URLs → false (save as a lead).
 */
export function hasRealWebsiteFromMapsListing(websiteUrl?: string | null): boolean {
  const raw = websiteUrl?.trim() ?? "";
  if (!raw) return false;

  const url = raw.startsWith("http") ? raw : `https://${raw}`;
  try {
    return isRealBusinessWebsite(url);
  } catch {
    return false;
  }
}

/** Saved leads always use this status in the UI. */
export const SAVED_LEAD_WEBSITE_STATUS = "no_website_found";

export function websiteStatusLabel(status: string | null | undefined): string {
  if (
    !status ||
    status === SAVED_LEAD_WEBSITE_STATUS ||
    status === "none" ||
    status === "NO_WEBSITE_FOUND" ||
    status === "social_only" ||
    status === "directory_only" ||
    status === "broken"
  ) {
    return "No website found";
  }
  if (status === "website_found" || status === "good" || status === "WEBSITE_FOUND") {
    return "Website found";
  }
  return status.replace(/_/g, " ");
}

/** @deprecated Use has_real_website === false; kept for legacy rows. */
export function isPitchListWebsiteStatus(status: string | null | undefined): boolean {
  return (
    status === SAVED_LEAD_WEBSITE_STATUS ||
    status === "none" ||
    status === "NO_WEBSITE_FOUND" ||
    status === "social_only" ||
    status === "directory_only" ||
    status === "broken"
  );
}

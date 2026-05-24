import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hasRealWebsiteFromMapsListing,
  SAVED_LEAD_WEBSITE_STATUS,
} from "./classify-website-status";
import { LEAD_SEARCH_FAILED, LEAD_SEARCH_UNAVAILABLE } from "@/lib/product-copy";
import { clampSampleSize, DEFAULT_SAMPLE_SIZE, reviewLimitForSampleSize } from "@/lib/sample-size";
import { buildScrapeQueries } from "@/lib/lead-discovery/build-scrape-queries";
import { searchModeFromDeepSearch } from "@/lib/lead-discovery/search-mode";
import {
  discoverWithGoogleMapsScraper,
  getMapsScraperConfig,
  MapsScraperError,
} from "./sources/google-maps-scraper";
import type { LeadCandidate } from "./types";

async function updateJob(
  db: SupabaseClient,
  jobId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await db
    .from("lead_discovery_jobs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", jobId);
}

function syntheticPlaceId(lead: LeadCandidate): string {
  const base = `${lead.name}|${lead.phone ?? ""}|${lead.address ?? ""}`.toLowerCase();
  const h = createHash("sha256").update(base).digest("hex").slice(0, 40);
  return `gms:${h}`;
}

function buildMapsQuery(niche: string, city: string): string {
  return `${niche.trim()} in ${city.trim()}`;
}

function listingWebsiteUrl(raw: LeadCandidate): string | null {
  const u = raw.websiteUrl?.trim();
  if (!u) return null;
  return u.startsWith("http") ? u : `https://${u}`;
}

export async function runLeadDiscoveryJob(db: SupabaseClient, jobId: string): Promise<void> {
  const { data: job, error: jobErr } = await db.from("lead_discovery_jobs").select("*").eq("id", jobId).single();
  if (jobErr || !job) throw new Error("Discovery job not found");

  const cfg = getMapsScraperConfig();
  if (!cfg.enabled) {
    await updateJob(db, jobId, {
      status: "failed",
      stage: "error",
      error: LEAD_SEARCH_UNAVAILABLE,
      finished_at: new Date().toISOString(),
    });
    return;
  }

  if (cfg.mode === "cli" && !cfg.binaryConfigured) {
    await updateJob(db, jobId, {
      status: "failed",
      stage: "error",
      error: LEAD_SEARCH_UNAVAILABLE,
      finished_at: new Date().toISOString(),
    });
    return;
  }

  const campaignId = job.campaign_id as string;
  const userId = job.user_id as string;

  const { data: campaign, error: campErr } = await db.from("campaigns").select("*").eq("id", campaignId).single();
  if (campErr || !campaign) throw new Error("Campaign not found");

  const niche = String(campaign.niche);
  const city = String(campaign.city);
  const query = buildMapsQuery(niche, city);

  const maxSampleSize =
    "max_sample_size" in campaign && typeof campaign.max_sample_size === "number"
      ? clampSampleSize(campaign.max_sample_size as number)
      : typeof (job.meta as { maxSampleSize?: number } | null)?.maxSampleSize === "number"
        ? clampSampleSize((job.meta as { maxSampleSize: number }).maxSampleSize)
        : DEFAULT_SAMPLE_SIZE;

  const deepSearch = Boolean(campaign.deep_search);
  const searchMode = searchModeFromDeepSearch(deepSearch);
  const reviewLimit = reviewLimitForSampleSize(maxSampleSize, deepSearch);
  const scrapeQueries = buildScrapeQueries(niche, city, { deepSearch });

  const meta: Record<string, unknown> = {
    source: "google_maps_scraper",
    query,
    deep_search: deepSearch,
    search_mode: searchMode,
    scrape_queries: scrapeQueries,
    scrape_query_count: scrapeQueries.length,
    niche,
    city,
    mode: cfg.mode,
    max_sample_size: maxSampleSize,
    review_limit: reviewLimit,
  };

  await updateJob(db, jobId, {
    status: "running",
    stage: "scraping",
    started_at: new Date().toISOString(),
    progress: 5,
    meta,
  });

  try {
    await updateJob(db, jobId, { stage: "scraping", progress: 15 });

    const candidates = await discoverWithGoogleMapsScraper({
      query,
      niche,
      city,
      deepSearch,
      sampleSize: maxSampleSize,
      jobId,
    });

    meta.total_scraped = candidates.length;

    await updateJob(db, jobId, {
      stage: "importing",
      progress: 40,
      leads_found: candidates.length,
      meta,
    });

    const rows: Record<string, unknown>[] = [];
    let totalSkipped = 0;

    await updateJob(db, jobId, { stage: "classifying", progress: 55, meta });

    for (let i = 0; i < candidates.length; i++) {
      const raw = candidates[i]!;
      const hasRealWebsite = hasRealWebsiteFromMapsListing(raw.websiteUrl);

      if (hasRealWebsite) {
        totalSkipped += 1;
        continue;
      }
      if (rows.length >= maxSampleSize) continue;

      const mapsListingUrl = listingWebsiteUrl(raw);

      rows.push({
        campaign_id: campaignId,
        user_id: userId,
        place_id: syntheticPlaceId(raw),
        name: raw.name.slice(0, 500),
        address: (raw.address ?? city).slice(0, 500),
        phone: raw.phone ?? null,
        rating: raw.rating ?? null,
        review_count: raw.reviewCount ?? null,
        google_maps_url: raw.googleMapsUrl ?? null,
        website_url: mapsListingUrl,
        website_status: SAVED_LEAD_WEBSITE_STATUS,
        business_status: null,
        category: (raw.category ?? niche).slice(0, 200),
        email: null,
        city: city.split(",")[0]?.trim() || null,
        state: null,
        has_real_website: false,
        website_quality_score: 0,
        lead_score: 0,
        lead_reason: null,
        discovery_source: "google_maps_scraper",
        source_url: raw.googleMapsUrl ?? null,
        latitude: raw.latitude ?? null,
        longitude: raw.longitude ?? null,
        raw_data: {
          ...(raw.rawData ?? {}),
          discoveryJobId: jobId,
          mapsListingWebsite: raw.websiteUrl ?? null,
          hasRealWebsite: false,
        },
        updated_at: new Date().toISOString(),
      });

      if (i % 5 === 4) {
        await updateJob(db, jobId, {
          progress: 55 + Math.floor((35 * i) / Math.max(1, candidates.length)),
          leads_enriched: i + 1,
          leads_no_website: rows.length,
          meta: {
            ...meta,
            total_saved: rows.length,
            total_skipped: totalSkipped,
          },
        });
      }
    }

    meta.total_saved = rows.length;
    meta.total_skipped = totalSkipped;

    await updateJob(db, jobId, { stage: "importing", progress: 85, meta });

    await db.from("search_queries").insert({
      user_id: userId,
      campaign_id: campaignId,
      discovery_job_id: jobId,
      query,
      location: city,
      category: niche,
      status: "ok",
      results_count: candidates.length,
    });

    if (rows.length > 0) {
      await updateJob(db, jobId, { stage: "importing", progress: 92 });
      const BATCH = 40;
      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
        const { error: upErr } = await db.from("businesses").upsert(chunk, { onConflict: "place_id" });
        if (upErr) throw new Error(upErr.message);
      }
    }

    await db
      .from("campaigns")
      .update({ last_discovery_at: new Date().toISOString() })
      .eq("id", campaignId)
      .eq("user_id", userId);

    meta.note = rows.length
      ? `Saved ${rows.length} qualified leads (${candidates.length} reviewed).`
      : candidates.length
        ? "No new leads — reviewed listings already have a real website."
        : "No businesses found for this search.";

    await updateJob(db, jobId, {
      status: "completed",
      stage: "done",
      progress: 100,
      leads_found: candidates.length,
      leads_enriched: candidates.length,
      leads_no_website: rows.length,
      meta,
      finished_at: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof MapsScraperError ? LEAD_SEARCH_FAILED : e instanceof Error ? e.message : String(e);
    await updateJob(db, jobId, {
      status: "failed",
      stage: "error",
      error: msg.slice(0, 2000),
      meta,
      finished_at: new Date().toISOString(),
    });
  }
}

import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";
import { runLeadDiscoveryJob } from "@/lib/lead-discovery/pipeline";
import {
  getMapsScraperConfig,
  resolveMapsScraperBinaryPath,
} from "@/lib/lead-discovery/sources/google-maps-scraper";
import { LEAD_SEARCH_UNAVAILABLE } from "@/lib/product-copy";
import { chargeCredits } from "@/lib/billing/require-credits";
import { searchModeFromDeepSearch } from "@/lib/lead-discovery/search-mode";
import { clampSampleSize, DEFAULT_SAMPLE_SIZE } from "@/lib/sample-size";

/** Serverless: finding leads can take several minutes. */
export const maxDuration = 300;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const db = dbAdmin();

  try {
    const scraperCfg = getMapsScraperConfig();
    if (!scraperCfg.enabled) {
      return NextResponse.json(
        { error: LEAD_SEARCH_UNAVAILABLE, reason: "scraper_disabled", hint: "Set MAPS_SCRAPER_ENABLED=true" },
        { status: 503 },
      );
    }
    if (scraperCfg.mode === "cli") {
      const resolvedBin = await resolveMapsScraperBinaryPath();
      if (!resolvedBin) {
        return NextResponse.json(
          {
            error: LEAD_SEARCH_UNAVAILABLE,
            reason: "binary_not_found",
            hint: "Deploy with Dockerfile and set MAPS_SCRAPER_BIN=/usr/bin/google-maps-scraper",
            configured_path: scraperCfg.binaryPath,
          },
          { status: 503 },
        );
      }
    }

    const raw = await request.json().catch(() => ({} as Record<string, unknown>));
    const bodyMax =
      typeof raw?.maxSampleSize === "number" ? clampSampleSize(raw.maxSampleSize) : undefined;

    const { data: campaign } = await db
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .single();
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const stored =
      typeof campaign.max_sample_size === "number"
        ? clampSampleSize(campaign.max_sample_size)
        : undefined;
    const maxUnique = bodyMax ?? stored ?? DEFAULT_SAMPLE_SIZE;

    if (bodyMax != null) {
      await db
        .from("campaigns")
        .update({ max_sample_size: maxUnique })
        .eq("id", id)
        .eq("user_id", auth.user.id);
    }

    const deepSearch = Boolean(campaign.deep_search);
    const searchMode = searchModeFromDeepSearch(deepSearch);

    const creditAction = deepSearch ? "lead_search.deep" : "lead_search.shallow";
    const charged = await chargeCredits(db, auth.user.id, creditAction, {
      campaign_id: id,
      deep_search: deepSearch,
    });
    if (!charged.ok) return charged.response;

    const query = `${String(campaign.niche).trim()} in ${String(campaign.city).trim()}`;

    const { data: jobRow, error: jobErr } = await db
      .from("lead_discovery_jobs")
      .insert({
        campaign_id: id,
        user_id: auth.user.id,
        status: "queued",
        stage: "queued",
        meta: {
          maxSampleSize: maxUnique,
          source: "google_maps_scraper",
          query,
          niche: String(campaign.niche),
          city: String(campaign.city),
          deep_search: deepSearch,
          search_mode: searchMode,
        },
      })
      .select("id")
      .single();

    if (jobErr || !jobRow) {
      return NextResponse.json(
        { error: jobErr?.message ?? "Could not start lead search. Try again in a moment." },
        { status: 500 },
      );
    }

    const jobId = jobRow.id as string;
    const sync =
      process.env.LEAD_DISCOVERY_SYNC === "1" || process.env.LEAD_DISCOVERY_SYNC === "true";

    if (sync) {
      await runLeadDiscoveryJob(db, jobId);
      const { data: businesses } = await db
        .from("businesses")
        .select("*")
        .eq("campaign_id", id)
        .eq("user_id", auth.user.id);
      const { data: job } = await db.from("lead_discovery_jobs").select("*").eq("id", jobId).single();
      return NextResponse.json({
        jobId,
        sync: true,
        job,
        maxSampleSize: maxUnique,
        savedBusinesses: businesses?.length ?? 0,
        businesses: businesses ?? [],
      });
    }

    // Persistent Docker/Railway: run in-process (after() is unreliable for long scrapes).
    void runLeadDiscoveryJob(db, jobId).catch((e) => {
      console.error("[find-leads background]", e);
    });

    return NextResponse.json({
      jobId,
      sync: false,
      pollUrl: `/api/campaigns/${id}/discovery-jobs/${jobId}`,
      maxSampleSize: maxUnique,
      note: "Lead search is running in the background.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[find-leads]", msg);
    const safe = msg.length > 500 ? `${msg.slice(0, 500)}…` : msg;
    return NextResponse.json({ error: safe }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";
import { findLeadsFromPlacesMultiQuery } from "@/lib/google-places";
import { clampSampleSize, DEFAULT_SAMPLE_SIZE } from "@/lib/sample-size";

/** Vercel/serverless: allow long Google aggregation (large sample sizes). */
export const maxDuration = 300;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const db = dbAdmin();

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

  const primaryQuery = `${campaign.niche} in ${campaign.city}`;
  const { places, queriesUsed, queryBudget } = await findLeadsFromPlacesMultiQuery(
    campaign.niche,
    campaign.city,
    maxUnique,
  );
  const rows = places.map((p) => ({
    campaign_id: campaign.id,
    user_id: auth.user.id,
    place_id: p.id,
    name: p.displayName?.text ?? "Unknown",
    address: p.formattedAddress ?? "",
    phone: p.nationalPhoneNumber ?? null,
    rating: p.rating ?? null,
    review_count: p.userRatingCount ?? null,
    google_maps_url: p.googleMapsUri ?? null,
    website_url: p.websiteUri ?? null,
    website_status: p.websiteUri ? "WEBSITE_FOUND" : "NO_WEBSITE_FOUND",
    business_status: p.businessStatus ?? null,
  }));

  if (rows.length > 0) {
    await db.from("businesses").upsert(rows, { onConflict: "place_id" });
  }

  const { data: businesses } = await db
    .from("businesses")
    .select("*")
    .eq("campaign_id", campaign.id)
    .eq("user_id", auth.user.id);
  const noWebsiteCount =
    businesses?.filter((business) => business.website_status === "NO_WEBSITE_FOUND").length ?? 0;
  return NextResponse.json({
    query: primaryQuery,
    queryBudgetPlanned: queryBudget,
    queriesExecuted: queriesUsed.length,
    queriesUsed,
    maxSampleSize: maxUnique,
    note:
      "Target sample size is a ceiling. Each text query returns at most ~60 places; overlap is heavy, so we run many distinct queries (queryBudgetPlanned). You may still get fewer uniques than the target if Google exhausts variation.",
    totalFromGoogle: places.length,
    savedBusinesses: businesses?.length ?? 0,
    noWebsiteCount,
    businesses: businesses ?? [],
  });
}

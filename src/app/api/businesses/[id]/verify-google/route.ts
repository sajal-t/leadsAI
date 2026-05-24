import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { chargeCredits } from "@/lib/billing/require-credits";
import { dbAdmin } from "@/lib/db";
import {
  assertGoogleVerificationAllowed,
  googleVerifyCreditsCost,
  logApiUsage,
} from "@/lib/lead-sources/cost-controls";
import { verifyBusinessMapListingViaBrave } from "@/lib/lead-sources/brave-maps-verification-provider";
import { activeWebSearchProvider } from "@/lib/lead-sources/web-search";
import { isRealBusinessWebsite } from "@/lib/lead-sources/website-detection";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const db = dbAdmin();

  const gate = await assertGoogleVerificationAllowed(db, auth.user.id);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: 403 });
  }

  const charged = await chargeCredits(db, auth.user.id, "google.verify", { business_id: id });
  if (!charged.ok) return charged.response;

  const { data: business, error: bErr } = await db
    .from("businesses")
    .select("*, campaigns(niche,city)")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single();

  if (bErr || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const camp = business.campaigns as { city?: string } | { city?: string }[] | null;
  const city = (Array.isArray(camp) ? camp[0]?.city : camp?.city) ?? "";

  try {
    const verified = await verifyBusinessMapListingViaBrave({
      name: String(business.name),
      city: String(city),
    });
    if (!verified) {
      return NextResponse.json(
        { error: "No Google Maps link found in web search for this business." },
        { status: 404 },
      );
    }

    const credits = googleVerifyCreditsCost();
    await logApiUsage(db, {
      userId: auth.user.id,
      provider: activeWebSearchProvider() ?? "web_search",
      action: "maps_listing_verify",
      estimatedCost: 0.01,
      creditsUsed: credits,
      meta: { businessId: id },
    });

    const websiteUrl = verified.websiteUrl ?? null;
    let website_status = "none";
    if (websiteUrl) {
      website_status = isRealBusinessWebsite(websiteUrl) ? "good" : "directory_only";
    }

    const raw = (business.raw_data as Record<string, unknown> | null) ?? {};

    await db
      .from("businesses")
      .update({
        google_maps_url: verified.sourceUrl ?? business.google_maps_url,
        website_url: websiteUrl ?? business.website_url,
        website_status,
        phone: verified.phone ?? business.phone,
        address: verified.address ?? business.address,
        rating: verified.rating ?? business.rating,
        review_count: verified.reviewCount ?? business.review_count,
        discovery_source: "brave_maps_listing_verify",
        raw_data: { ...raw, mapListingVerification: verified.rawData },
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", auth.user.id);

    return NextResponse.json({
      ok: true,
      creditsUsed: credits,
      website_status,
      googleMapsUrl: verified.sourceUrl ?? null,
      websiteUrl,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg.slice(0, 500) }, { status: 502 });
  }
}

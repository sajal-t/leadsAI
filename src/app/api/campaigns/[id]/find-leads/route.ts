import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";
import { findLeadsFromPlaces } from "@/lib/google-places";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const db = dbAdmin();

  const { data: campaign } = await db
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single();
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const query = `${campaign.niche} in ${campaign.city}`;
  const places = await findLeadsFromPlaces(query, 1000);
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
    query,
    totalFromGoogle: places.length,
    savedBusinesses: businesses?.length ?? 0,
    noWebsiteCount,
    businesses: businesses ?? [],
  });
}

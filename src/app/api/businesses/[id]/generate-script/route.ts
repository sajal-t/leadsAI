import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserOr401 } from "@/lib/auth";
import { chargeCredits } from "@/lib/billing/require-credits";
import { parseColdCallScript } from "@/lib/cold-call-script-schema";
import { dbAdmin } from "@/lib/db";
import { jsonCompletionWithSystem } from "@/lib/openai";
import {
  buildNewScriptUserPrompt,
  buildRegenerateScriptUserPrompt,
  pickRandomRegenerationAngle,
  REGENERATION_ANGLES,
  SCRIPT_SYSTEM_PROMPT,
} from "@/lib/script-prompts";

const bodySchema = z.object({
  mode: z.enum(["new", "regenerate"]).default("new"),
  previous_script_id: z.string().uuid().optional(),
  angle: z.string().optional(),
});

function templateVars(
  business: Record<string, unknown>,
  campaign: { niche?: string; city?: string } | null,
  profile: { agency_name?: string | null } | null,
  previewUrl: string,
) {
  const websiteStatus =
    typeof business.website_status === "string" ? business.website_status : "NO_WEBSITE_FOUND";
  return {
    business_name: String(business.name ?? ""),
    niche: campaign?.niche ?? "Local business",
    city: campaign?.city ?? "",
    address: String(business.address ?? ""),
    phone: String(business.phone ?? ""),
    rating: business.rating != null ? String(business.rating) : "N/A",
    review_count: business.review_count != null ? String(business.review_count) : "N/A",
    website_status: websiteStatus,
    google_maps_url: String(business.google_maps_url ?? ""),
    agency_name: profile?.agency_name ?? process.env.AGENCY_NAME ?? "Your agency",
    caller_name: process.env.CALLER_NAME?.trim() ?? "",
    offer_description:
      process.env.AGENCY_OFFER_DESCRIPTION ??
      "Modern, fast websites that help local businesses get found and convert more calls.",
    pricing: process.env.AGENCY_PRICING_EXAMPLE ?? "Happy to share ranges after a quick look at what you need.",
    preview_url: previewUrl || "(none)",
  };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const db = dbAdmin();

  const charged = await chargeCredits(db, auth.user.id, "script.generate", { business_id: id });
  if (!charged.ok) return charged.response;

  let parsedBody: z.infer<typeof bodySchema> = { mode: "new" };
  if (request.headers.get("content-type")?.includes("application/json")) {
    const json = await request.json().catch(() => ({}));
    parsedBody = bodySchema.parse({ ...parsedBody, ...json });
  }

  const [{ data: business }, { data: profile }] = await Promise.all([
    db.from("businesses").select("*").eq("id", id).eq("user_id", auth.user.id).single(),
    db.from("profiles").select("*").eq("id", auth.user.id).single(),
  ]);
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const campaign = business.campaign_id
    ? (await db.from("campaigns").select("niche,city").eq("id", business.campaign_id).single()).data
    : null;

  const { data: latestSite } = await db
    .from("generated_sites")
    .select("preview_slug")
    .eq("business_id", id)
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const previewUrl = latestSite?.preview_slug ? `${baseUrl}/preview/${latestSite.preview_slug}` : "";

  const vars = templateVars(business as Record<string, unknown>, campaign, profile, previewUrl);

  let userPrompt: string;
  let angle: string | null = null;

  if (parsedBody.mode === "regenerate") {
    if (!parsedBody.previous_script_id) {
      return NextResponse.json({ error: "previous_script_id required for regenerate" }, { status: 400 });
    }
    const { data: prev } = await db
      .from("generated_scripts")
      .select("*")
      .eq("id", parsedBody.previous_script_id)
      .eq("business_id", id)
      .eq("user_id", auth.user.id)
      .single();
    if (!prev) return NextResponse.json({ error: "Previous script not found" }, { status: 404 });

    let regAngle = parsedBody.angle;
    if (!regAngle || regAngle === "auto") {
      regAngle = pickRandomRegenerationAngle();
    }
    if (!(REGENERATION_ANGLES as readonly string[]).includes(regAngle)) {
      return NextResponse.json(
        { error: `Invalid angle. Use one of: auto, ${REGENERATION_ANGLES.join(", ")}` },
        { status: 400 },
      );
    }
    angle = regAngle;
    userPrompt = buildRegenerateScriptUserPrompt(
      vars,
      JSON.stringify(prev.script_json, null, 2),
      regAngle,
    );
  } else {
    userPrompt = buildNewScriptUserPrompt(vars);
  }

  const rawJson = await jsonCompletionWithSystem(SCRIPT_SYSTEM_PROMPT, userPrompt);
  let scriptJson: unknown = rawJson;
  try {
    scriptJson = parseColdCallScript(rawJson);
  } catch (e) {
    return NextResponse.json(
      { error: "Model returned invalid script JSON", detail: e instanceof Error ? e.message : String(e) },
      { status: 422 },
    );
  }

  const { data: versionRow } = await db
    .from("generated_scripts")
    .select("version_number")
    .eq("business_id", id)
    .eq("user_id", auth.user.id)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (versionRow?.version_number ?? 0) + 1;

  const { error: deactivateError } = await db
    .from("generated_scripts")
    .update({ is_active: false })
    .eq("business_id", id)
    .eq("user_id", auth.user.id);
  if (deactivateError) {
    // Column may not exist before migration 003 — ignore.
  }

  const insertPayload: Record<string, unknown> = {
    business_id: id,
    user_id: auth.user.id,
    script_json: scriptJson,
    version_number: nextVersion,
    is_active: true,
    angle: parsedBody.mode === "regenerate" ? angle : null,
  };

  const { data, error } = await db.from("generated_scripts").insert(insertPayload).select("*").single();

  if (error) {
    const fallback = await db
      .from("generated_scripts")
      .insert({
        business_id: id,
        user_id: auth.user.id,
        script_json: scriptJson,
      })
      .select("*")
      .single();
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 400 });
    return NextResponse.json({ ...fallback.data, warning: "Run migration 003 for angle/version/is_active columns." });
  }

  return NextResponse.json(data);
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";
import { assertCanSpend } from "@/lib/billing/billing-service";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { searchModeFromDeepSearch } from "@/lib/lead-discovery/search-mode";
import { clampSampleSize } from "@/lib/sample-size";

const schema = z.object({
  niche: z.string().min(1),
  city: z.string().min(1),
  deep_search: z.boolean().optional().default(false),
  /** Target max unique businesses to merge from Google (multi-query). Clamped server-side. */
  maxSampleSize: z.number().int().min(60).max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;
  const parsed = schema.parse(await request.json());
  const { maxSampleSize, deep_search: deepSearch, ...rest } = parsed;
  const searchMode = searchModeFromDeepSearch(deepSearch);
  const db = dbAdmin();

  if (deepSearch) {
    const check = await assertCanSpend(db, auth.user.id, "lead_search.deep", { requireDeepSearch: true });
    if (!check.ok) return billingErrorResponse(check);
  } else {
    const paywallCheck = await assertCanSpend(db, auth.user.id, "lead_search.shallow");
    if (!paywallCheck.ok) return billingErrorResponse(paywallCheck);
  }

  // Ensure profile exists before inserting rows that reference profiles(id).
  await db.from("profiles").upsert({
    id: auth.user.id,
    email: auth.user.email ?? null,
  });

  // Insert without max_sample_size so campaigns still work if migration 002 is not applied yet.
  const { data, error } = await db
    .from("campaigns")
    .insert({
      user_id: auth.user.id,
      ...rest,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof maxSampleSize === "number") {
    patch.max_sample_size = clampSampleSize(maxSampleSize);
  }
  patch.deep_search = deepSearch;
  patch.search_mode = searchMode;

  if (Object.keys(patch).length > 0) {
    const { data: updated, error: updateError } = await db
      .from("campaigns")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (!updateError && updated) {
      return NextResponse.json({
        ...updated,
        search_mode: searchMode,
        deep_search: deepSearch,
      });
    }
  }

  return NextResponse.json({ ...data, search_mode: searchMode, deep_search: deepSearch });
}

/** Delete all campaigns for the current user (cascades to businesses, calls, scripts, sites, deals, AI studio rows). */
export async function DELETE(request: NextRequest) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;
  const db = dbAdmin();

  const { error } = await db.from("campaigns").delete().eq("user_id", auth.user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

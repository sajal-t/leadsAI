import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";
import { clampSampleSize } from "@/lib/sample-size";

const schema = z.object({
  niche: z.string().min(1),
  city: z.string().min(1),
  radius: z.number().nullable().optional(),
  /** Target max unique businesses to merge from Google (multi-query). Clamped server-side. */
  maxSampleSize: z.number().int().min(60).max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;
  const parsed = schema.parse(await request.json());
  const { maxSampleSize, ...rest } = parsed;
  const db = dbAdmin();

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

  if (typeof maxSampleSize === "number") {
    const clamped = clampSampleSize(maxSampleSize);
    const { error: updateError } = await db
      .from("campaigns")
      .update({ max_sample_size: clamped })
      .eq("id", data.id);
    if (!updateError) {
      return NextResponse.json({ ...data, max_sample_size: clamped });
    }
  }

  return NextResponse.json(data);
}

/** Delete all campaigns for the current user (cascades to businesses, calls, scripts, emails, sites, deals, AI studio rows). */
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

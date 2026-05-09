import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";
import { CALL_OUTCOMES } from "@/lib/types";

const schema = z.object({
  business_id: z.string().uuid(),
  outcome: z.enum(CALL_OUTCOMES),
  notes: z.string().optional(),
  follow_up_needed: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await getUserOr401();
  if ("error" in auth) return auth.error;
  const formData = await request.formData().catch(() => null);
  const raw =
    formData !== null
      ? {
          business_id: String(formData.get("business_id")),
          outcome: String(formData.get("outcome")),
          notes: String(formData.get("notes") || ""),
          follow_up_needed: formData.get("follow_up_needed") === "true",
        }
      : await request.json();
  const body = schema.parse(raw);

  const db = dbAdmin();
  const { data, error } = await db
    .from("call_logs")
    .insert({ ...body, user_id: auth.user.id })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (body.outcome === "closed_won") {
    await db.from("deals").upsert({
      business_id: body.business_id,
      user_id: auth.user.id,
      stage: "closed_won",
      closed_at: new Date().toISOString(),
    });
  }

  return NextResponse.json(data);
}

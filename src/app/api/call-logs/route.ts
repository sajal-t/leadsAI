import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";

const OUTCOME_ENUM = z.enum([
  "no_answer",
  "voicemail",
  "wrong_number",
  "interested",
  "send_info",
  "callback",
  "meeting_booked",
  "not_interested",
  "already_has_someone",
  "too_expensive",
  "does_not_need_website",
  "closed_won",
  "closed_lost",
  "other",
]);

const schema = z.object({
  business_id: z.string().uuid(),
  outcome: OUTCOME_ENUM,
  answered: z.boolean().optional().nullable(),
  answered_by: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  follow_up_needed: z.boolean().optional(),
  generate_email_requested: z.boolean().optional(),
  generate_site_requested: z.boolean().optional(),
  callback_at: z.string().optional().nullable(),
  meeting_at: z.string().optional().nullable(),
  contact_email: z.string().optional().nullable(),
  interest_tags: z.array(z.string()).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

function inferFollowUp(outcome: string, explicit?: boolean) {
  if (explicit !== undefined) return explicit;
  return ["interested", "send_info", "voicemail", "callback", "meeting_booked"].includes(outcome);
}

function toIsoOrNull(value: string | null | undefined): string | null {
  if (value == null || String(value).trim() === "") return null;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString();
}

export async function POST(request: NextRequest) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;

  const formData = await request.formData().catch(() => null);
  let raw: unknown;
  if (formData) {
    raw = {
      business_id: String(formData.get("business_id")),
      outcome: String(formData.get("outcome")),
      notes: formData.get("notes") ? String(formData.get("notes")) : undefined,
      follow_up_needed: formData.get("follow_up_needed") === "true",
    };
  } else {
    raw = await request.json();
  }

  const body = schema.parse(raw);

  const follow_up_needed = inferFollowUp(body.outcome, body.follow_up_needed);

  const insertRow: Record<string, unknown> = {
    business_id: body.business_id,
    user_id: auth.user.id,
    outcome: body.outcome,
    notes: body.notes ?? null,
    follow_up_needed,
    generate_email_requested: body.generate_email_requested ?? false,
    generate_site_requested: body.generate_site_requested ?? false,
    answered: body.answered ?? null,
    answered_by: body.answered_by ?? null,
    callback_at: toIsoOrNull(body.callback_at),
    meeting_at: toIsoOrNull(body.meeting_at),
    contact_email: body.contact_email || null,
    interest_tags: body.interest_tags ?? null,
    metadata: body.metadata ?? null,
  };

  const db = dbAdmin();
  const { data, error } = await db.from("call_logs").insert(insertRow).select("*").single();

  if (error) {
    const minimal = await db
      .from("call_logs")
      .insert({
        business_id: body.business_id,
        user_id: auth.user.id,
        outcome: body.outcome,
        notes: body.notes ?? null,
        follow_up_needed,
      })
      .select("*")
      .single();
    if (minimal.error) return NextResponse.json({ error: minimal.error.message }, { status: 400 });
    return NextResponse.json({
      ...minimal.data,
      warning: "Run migration 003 for full call_logs columns.",
      generate_email_requested: body.generate_email_requested,
      generate_site_requested: body.generate_site_requested,
    });
  }

  if (body.outcome === "closed_won") {
    await db.from("deals").upsert({
      business_id: body.business_id,
      user_id: auth.user.id,
      stage: "closed_won",
      closed_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    ...data,
    generate_email_requested: body.generate_email_requested,
    generate_site_requested: body.generate_site_requested,
  });
}

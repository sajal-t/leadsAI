import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";
import { parseMoneyInput, upsertBusinessDealRevenue } from "@/lib/deal-revenue";

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
  generate_site_requested: z.boolean().optional(),
  callback_at: z.string().optional().nullable(),
  meeting_at: z.string().optional().nullable(),
  interest_tags: z.array(z.string()).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  setup_fee: z.union([z.number(), z.string()]).optional(),
  monthly_fee: z.union([z.number(), z.string()]).optional(),
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

async function parseBody(request: NextRequest): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json") || contentType.includes("+json")) {
    return request.json();
  }

  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    const formData = await request.formData();
    const interestRaw = formData.get("interest_tags");
    let interest_tags: string[] | undefined;
    if (typeof interestRaw === "string" && interestRaw.trim()) {
      try {
        interest_tags = JSON.parse(interestRaw) as string[];
      } catch {
        interest_tags = interestRaw.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
    const metadataRaw = formData.get("metadata");
    let metadata: Record<string, unknown> | undefined;
    if (typeof metadataRaw === "string" && metadataRaw.trim()) {
      try {
        metadata = JSON.parse(metadataRaw) as Record<string, unknown>;
      } catch {
        metadata = undefined;
      }
    }
    return {
      business_id: String(formData.get("business_id") ?? ""),
      outcome: String(formData.get("outcome") ?? ""),
      notes: formData.get("notes") ? String(formData.get("notes")) : undefined,
      follow_up_needed:
        formData.get("follow_up_needed") === "true" ? true : formData.get("follow_up_needed") === "false" ? false : undefined,
      answered:
        formData.get("answered") === "true" ? true : formData.get("answered") === "false" ? false : undefined,
      answered_by: formData.get("answered_by") ? String(formData.get("answered_by")) : undefined,
      generate_site_requested: formData.get("generate_site_requested") === "true",
      callback_at: formData.get("callback_at") ? String(formData.get("callback_at")) : undefined,
      meeting_at: formData.get("meeting_at") ? String(formData.get("meeting_at")) : undefined,
      interest_tags,
      metadata,
    };
  }

  const text = await request.text();
  if (!text.trim()) {
    throw new Error("Empty request body");
  }
  return JSON.parse(text) as unknown;
}

export async function POST(request: NextRequest) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;

  let raw: unknown;
  try {
    raw = await parseBody(request);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const body = schema.parse(raw);

  const follow_up_needed = inferFollowUp(body.outcome, body.follow_up_needed);

  const insertRow: Record<string, unknown> = {
    business_id: body.business_id,
    user_id: auth.user.id,
    outcome: body.outcome,
    notes: body.notes ?? null,
    follow_up_needed,
    generate_site_requested: body.generate_site_requested ?? false,
    answered: body.answered ?? null,
    answered_by: body.answered_by ?? null,
    callback_at: toIsoOrNull(body.callback_at),
    meeting_at: toIsoOrNull(body.meeting_at),
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
      generate_site_requested: body.generate_site_requested,
    });
  }

  if (body.outcome === "closed_won") {
    try {
      await upsertBusinessDealRevenue(db, {
        businessId: body.business_id,
        userId: auth.user.id,
        setupFee: parseMoneyInput(body.setup_fee),
        monthlyFee: parseMoneyInput(body.monthly_fee),
        stage: "closed_won",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save deal revenue";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({
    ...data,
    generate_site_requested: body.generate_site_requested,
  });
}

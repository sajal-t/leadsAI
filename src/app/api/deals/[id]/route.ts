import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";
import { PIPELINE_COLUMNS } from "@/lib/pipeline-stages";

const ALLOWED_DB_STAGES = new Set<string>(PIPELINE_COLUMNS.map((c) => c.dbStage));

const patchSchema = z.object({
  stage: z.string().refine((s) => ALLOWED_DB_STAGES.has(s), "Invalid stage"),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = patchSchema.parse(await request.json());

  const db = dbAdmin();
  const { data: row, error: fetchErr } = await db.from("deals").select("id").eq("id", id).eq("user_id", auth.user.id).single();
  if (fetchErr || !row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await db
    .from("deals")
    .update({
      stage: body.stage,
      closed_at: body.stage === "closed_won" || body.stage === "closed_lost" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", auth.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

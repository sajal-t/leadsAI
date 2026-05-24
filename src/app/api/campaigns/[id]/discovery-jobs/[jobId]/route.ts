import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; jobId: string }> }) {
  const auth = await getUserOr401(_request);
  if ("error" in auth) return auth.error;
  const { id: campaignId, jobId } = await params;
  const db = dbAdmin();

  const { data: job, error } = await db
    .from("lead_discovery_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("campaign_id", campaignId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}

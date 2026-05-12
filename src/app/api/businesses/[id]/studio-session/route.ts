import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";
import { ensureAiSiteProjectForBusiness } from "@/lib/ensure-ai-site-project";

/** Creates or returns the AI Studio project for this business (no model call). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;

  const { id: businessId } = await params;
  const db = dbAdmin();

  const { data: business } = await db.from("businesses").select("id").eq("id", businessId).eq("user_id", auth.user.id).single();
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const result = await ensureAiSiteProjectForBusiness(db, businessId, auth.user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.errorMessage }, { status: 500 });
  }

  return NextResponse.json({ project_id: result.projectId });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserOr401 } from "@/lib/auth";
import { activatePlan } from "@/lib/billing/billing-service";
import { isMockBillingEnabled } from "@/lib/billing/dev-flags";
import { dbAdmin } from "@/lib/db";

const schema = z.object({
  plan: z.enum(["starter", "pro", "agency", "free"]),
});

/** Dev-only instant plan activation — requires ALLOW_MOCK_BILLING=true */
export async function POST(request: NextRequest) {
  if (!isMockBillingEnabled()) {
    return NextResponse.json({ error: "Mock billing is disabled." }, { status: 403 });
  }

  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;

  const { plan } = schema.parse(await request.json());
  const db = dbAdmin();
  const billing = await activatePlan(db, auth.user.id, plan, { source: "mock" });

  return NextResponse.json({ ok: true, billing });
}

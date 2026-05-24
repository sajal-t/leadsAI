import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";
import { parseMoneyInput, upsertBusinessDealRevenue } from "@/lib/deal-revenue";

const schema = z.object({
  setup_fee: z.union([z.number(), z.string()]).optional(),
  monthly_fee: z.union([z.number(), z.string()]).optional(),
  mark_won: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;
  const { id: businessId } = await params;
  const db = dbAdmin();

  const { data: business } = await db
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("user_id", auth.user.id)
    .single();
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { data: deal } = await db
    .from("deals")
    .select("id,stage,setup_fee,monthly_fee,closed_at")
    .eq("business_id", businessId)
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ deal: deal ?? null });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;
  const { id: businessId } = await params;
  const body = schema.parse(await request.json());

  const db = dbAdmin();
  const { data: business } = await db
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("user_id", auth.user.id)
    .single();
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  try {
    const { dealId } = await upsertBusinessDealRevenue(db, {
      businessId,
      userId: auth.user.id,
      setupFee: parseMoneyInput(body.setup_fee),
      monthlyFee: parseMoneyInput(body.monthly_fee),
      stage: body.mark_won === false ? "lead" : "closed_won",
    });

    const { data: deal } = await db.from("deals").select("*").eq("id", dealId).single();
    return NextResponse.json({ deal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save revenue";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

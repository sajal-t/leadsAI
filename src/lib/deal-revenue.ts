import type { SupabaseClient } from "@supabase/supabase-js";

export function parseMoneyInput(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value * 100) / 100);
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.]/g, "");
    if (!cleaned) return 0;
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) ? Math.max(0, Math.round(n * 100) / 100) : 0;
  }
  return 0;
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export type DealRevenueRow = {
  id: string;
  business_id: string;
  stage: string;
  setup_fee: number;
  monthly_fee: number;
};

export function sumDealRevenue(deals: { stage: string; setup_fee?: number | null; monthly_fee?: number | null }[]) {
  const won = deals.filter((d) => d.stage === "closed_won");
  const setupTotal = won.reduce((s, d) => s + Number(d.setup_fee ?? 0), 0);
  const mrr = won.reduce((s, d) => s + Number(d.monthly_fee ?? 0), 0);
  return { wonCount: won.length, setupTotal, mrr, arr: mrr * 12 };
}

/** Create or update the deal for this business with revenue amounts. */
export async function upsertBusinessDealRevenue(
  db: SupabaseClient,
  opts: {
    businessId: string;
    userId: string;
    setupFee: number;
    monthlyFee: number;
    stage?: "closed_won" | "lead";
  },
): Promise<{ dealId: string }> {
  const stage = opts.stage ?? "closed_won";
  const payload = {
    setup_fee: opts.setupFee,
    monthly_fee: opts.monthlyFee,
    stage,
    closed_at: stage === "closed_won" ? new Date().toISOString() : null,
  };

  const { data: existing } = await db
    .from("deals")
    .select("id")
    .eq("business_id", opts.businessId)
    .eq("user_id", opts.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await db.from("deals").update(payload).eq("id", existing.id).eq("user_id", opts.userId);
    if (error) throw new Error(error.message);
    return { dealId: existing.id as string };
  }

  const { data, error } = await db
    .from("deals")
    .insert({
      business_id: opts.businessId,
      user_id: opts.userId,
      ...payload,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { dealId: data.id as string };
}

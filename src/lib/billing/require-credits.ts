import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { assertCanSpend, spendCredits, type BillingState } from "@/lib/billing/billing-service";
import type { CreditAction } from "@/lib/billing/credit-costs";

export async function requireCredits(
  db: SupabaseClient,
  userId: string,
  action: CreditAction,
  opts?: { requireDeepSearch?: boolean },
): Promise<{ ok: true; billing: BillingState } | { ok: false; response: NextResponse }> {
  const check = await assertCanSpend(db, userId, action, opts);
  if (!check.ok) {
    return { ok: false, response: billingErrorResponse(check) };
  }
  return { ok: true, billing: check.billing };
}

export async function chargeCredits(
  db: SupabaseClient,
  userId: string,
  action: CreditAction,
  metadata?: Record<string, unknown>,
): Promise<{ ok: true; balanceAfter: number } | { ok: false; response: NextResponse }> {
  const gate = await requireCredits(db, userId, action, {
    requireDeepSearch: action === "lead_search.deep",
  });
  if (!gate.ok) return gate;

  try {
    const { balanceAfter } = await spendCredits(db, userId, action, metadata);
    return { ok: true, balanceAfter };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Billing error";
    return {
      ok: false,
      response: NextResponse.json({ error: msg, code: "billing_error" }, { status: 402 }),
    };
  }
}

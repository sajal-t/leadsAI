import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { getBillingState } from "@/lib/billing/billing-service";
import { isMockBillingEnabled, isStripeConfigured } from "@/lib/billing/dev-flags";
import { CREDIT_COSTS, CREDIT_ACTION_LABELS } from "@/lib/billing/credit-costs";
import { BILLING_PLANS, PLANS } from "@/lib/billing/plans";
import { dbAdmin } from "@/lib/db";

export async function GET() {
  const auth = await getUserOr401();
  if ("error" in auth) return auth.error;

  const db = dbAdmin();
  const billing = await getBillingState(db, auth.user.id);

  return NextResponse.json({
    billing,
    plans: BILLING_PLANS.filter((p) => p !== "free").map((planId) => PLANS[planId]),
    creditCosts: CREDIT_COSTS,
    creditLabels: CREDIT_ACTION_LABELS,
    stripeEnabled: isStripeConfigured(),
    mockBillingEnabled: isMockBillingEnabled(),
  });
}

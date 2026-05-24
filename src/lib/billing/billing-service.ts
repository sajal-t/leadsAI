import type { SupabaseClient } from "@supabase/supabase-js";
import { isBillingDisabled } from "@/lib/billing/dev-flags";
import { creditCost, type CreditAction } from "@/lib/billing/credit-costs";
import {
  isPaidPlan,
  normalizePlan,
  PLANS,
  type BillingPlan,
  planAllowsDeepSearch,
} from "@/lib/billing/plans";

export type BillingState = {
  plan: BillingPlan;
  planName: string;
  isPaid: boolean;
  creditsBalance: number;
  creditsMonthlyAllowance: number;
  creditsPeriodStart: string | null;
  creditsPeriodEnd: string | null;
  deepSearchAllowed: boolean;
  billingDisabled: boolean;
  stripeCustomerId: string | null;
};

const BILLING_COLUMNS =
  "billing_plan,credits_balance,credits_monthly_allowance,credits_period_start,credits_period_end,stripe_customer_id,stripe_subscription_id";

type ProfileBillingRow = {
  billing_plan?: string | null;
  credits_balance?: number | null;
  credits_monthly_allowance?: number | null;
  credits_period_start?: string | null;
  credits_period_end?: string | null;
};

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

async function writeLedger(
  db: SupabaseClient,
  userId: string,
  action: string,
  delta: number,
  balanceAfter: number,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await db.from("credit_transactions").insert({
    user_id: userId,
    action,
    credits_delta: delta,
    balance_after: balanceAfter,
    metadata: metadata ?? {},
  });
}

export async function refreshBillingPeriodIfNeeded(
  db: SupabaseClient,
  userId: string,
  row: ProfileBillingRow,
): Promise<ProfileBillingRow> {
  const plan = normalizePlan(row.billing_plan);
  const allowance = PLANS[plan].creditsPerMonth;
  const now = new Date();
  const periodEnd = row.credits_period_end ? new Date(row.credits_period_end) : null;

  const needsReset =
    !periodEnd || Number.isNaN(periodEnd.getTime()) || now >= periodEnd || row.credits_monthly_allowance !== allowance;

  if (!needsReset && isPaidPlan(plan)) {
    return row;
  }

  if (!isPaidPlan(plan)) {
    return row;
  }

  const periodStart = now.toISOString();
  const newPeriodEnd = addDays(now, 30).toISOString();

  const { data, error } = await db
    .from("profiles")
    .update({
      credits_balance: allowance,
      credits_monthly_allowance: allowance,
      credits_period_start: periodStart,
      credits_period_end: newPeriodEnd,
    })
    .eq("id", userId)
    .select(BILLING_COLUMNS)
    .single();

  if (error) throw new Error(error.message);

  await writeLedger(db, userId, "billing.period_reset", allowance, allowance, {
    plan,
    period_start: periodStart,
    period_end: newPeriodEnd,
  });

  return (data ?? row) as ProfileBillingRow;
}

export async function getBillingState(db: SupabaseClient, userId: string): Promise<BillingState> {
  if (isBillingDisabled()) {
    return {
      plan: "pro",
      planName: PLANS.pro.name,
      isPaid: true,
      creditsBalance: 999_999,
      creditsMonthlyAllowance: PLANS.pro.creditsPerMonth,
      creditsPeriodStart: null,
      creditsPeriodEnd: null,
      deepSearchAllowed: true,
      billingDisabled: true,
      stripeCustomerId: null,
    };
  }

  const { data: raw, error } = await db.from("profiles").select(BILLING_COLUMNS).eq("id", userId).maybeSingle();

  if (error) {
    if (error.message.includes("billing_plan") || error.message.includes("credits_balance")) {
      return {
        plan: "free",
        planName: PLANS.free.name,
        isPaid: false,
        creditsBalance: 0,
        creditsMonthlyAllowance: 0,
        creditsPeriodStart: null,
        creditsPeriodEnd: null,
        deepSearchAllowed: false,
        billingDisabled: false,
        stripeCustomerId: null,
      };
    }
    throw new Error(error.message);
  }

  let row = (raw ?? {}) as ProfileBillingRow & {
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
  };
  if (isPaidPlan(normalizePlan(row.billing_plan))) {
    row = await refreshBillingPeriodIfNeeded(db, userId, row);
  }

  const plan = normalizePlan(row.billing_plan);
  const def = PLANS[plan];

  return {
    plan,
    planName: def.name,
    isPaid: isPaidPlan(plan),
    creditsBalance: Math.max(0, Number(row.credits_balance ?? 0)),
    creditsMonthlyAllowance: def.creditsPerMonth,
    creditsPeriodStart: row.credits_period_start ?? null,
    creditsPeriodEnd: row.credits_period_end ?? null,
    deepSearchAllowed: planAllowsDeepSearch(plan),
    billingDisabled: false,
    stripeCustomerId: row.stripe_customer_id ?? null,
  };
}

export type SpendResult =
  | { ok: true; balanceAfter: number; cost: number }
  | { ok: false; reason: "paywall" | "insufficient_credits" | "feature_locked"; message: string };

export async function assertCanSpend(
  db: SupabaseClient,
  userId: string,
  action: CreditAction,
  opts?: { requireDeepSearch?: boolean },
): Promise<SpendResult & { billing: BillingState }> {
  const billing = await getBillingState(db, userId);

  if (billing.billingDisabled) {
    return { ok: true, balanceAfter: billing.creditsBalance, cost: 0, billing };
  }

  if (!billing.isPaid) {
    return {
      ok: false,
      reason: "paywall",
      message: "Upgrade to a paid plan to use this feature.",
      billing,
    };
  }

  if (opts?.requireDeepSearch && !billing.deepSearchAllowed) {
    return {
      ok: false,
      reason: "feature_locked",
      message: "Deep search requires a paid plan.",
      billing,
    };
  }

  const cost = creditCost(action);
  if (billing.creditsBalance < cost) {
    return {
      ok: false,
      reason: "insufficient_credits",
      message: `Not enough credits (need ${cost}, have ${billing.creditsBalance}). Upgrade or wait for your monthly reset.`,
      billing,
    };
  }

  return { ok: true, balanceAfter: billing.creditsBalance - cost, cost, billing };
}

export async function spendCredits(
  db: SupabaseClient,
  userId: string,
  action: CreditAction,
  metadata?: Record<string, unknown>,
): Promise<{ balanceAfter: number; cost: number }> {
  if (isBillingDisabled()) {
    return { balanceAfter: 999_999, cost: 0 };
  }

  const check = await assertCanSpend(db, userId, action, {
    requireDeepSearch: action === "lead_search.deep",
  });
  if (!check.ok) {
    throw new Error(check.message);
  }

  const cost = check.cost;
  const newBalance = check.balanceAfter;

  const { error } = await db
    .from("profiles")
    .update({ credits_balance: newBalance })
    .eq("id", userId)
    .gte("credits_balance", cost);

  if (error) throw new Error(error.message);

  await writeLedger(db, userId, action, -cost, newBalance, metadata);

  return { balanceAfter: newBalance, cost };
}

type ActivatePlanOpts = {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  creditsPeriodEnd?: string | null;
  source?: string;
};

export async function downgradeToFree(
  db: SupabaseClient,
  userId: string,
  opts?: { keepStripeCustomer?: boolean },
): Promise<BillingState> {
  const patch: Record<string, unknown> = {
    billing_plan: "free",
    credits_balance: 0,
    credits_monthly_allowance: 0,
    credits_period_start: null,
    credits_period_end: null,
    stripe_subscription_id: null,
  };
  if (!opts?.keepStripeCustomer) {
    patch.stripe_customer_id = null;
  }

  await db.from("profiles").update(patch).eq("id", userId);
  await writeLedger(db, userId, "billing.downgrade", 0, 0, { source: opts?.keepStripeCustomer ? "stripe" : "manual" });
  return getBillingState(db, userId);
}

/** Activate or change a paid plan (Stripe webhook or dev mock). */
export async function activatePlan(
  db: SupabaseClient,
  userId: string,
  plan: BillingPlan,
  opts?: ActivatePlanOpts,
): Promise<BillingState> {
  if (plan === "free") {
    return downgradeToFree(db, userId);
  }

  const allowance = PLANS[plan].creditsPerMonth;
  const now = new Date();
  const periodEnd = opts?.creditsPeriodEnd ?? addDays(now, 30).toISOString();

  const patch: Record<string, unknown> = {
    billing_plan: plan,
    credits_balance: allowance,
    credits_monthly_allowance: allowance,
    credits_period_start: now.toISOString(),
    credits_period_end: periodEnd,
  };
  if (opts?.stripeCustomerId) patch.stripe_customer_id = opts.stripeCustomerId;
  if (opts?.stripeSubscriptionId) patch.stripe_subscription_id = opts.stripeSubscriptionId;

  await db.from("profiles").update(patch).eq("id", userId);

  await writeLedger(db, userId, "billing.subscribe", allowance, allowance, {
    plan,
    source: opts?.source ?? "manual",
  });

  return getBillingState(db, userId);
}

/** Monthly renewal — reset credits to plan allowance. */
export async function renewPlanCredits(
  db: SupabaseClient,
  userId: string,
  plan: Exclude<BillingPlan, "free">,
  opts?: { source?: string },
): Promise<void> {
  const allowance = PLANS[plan].creditsPerMonth;
  const now = new Date();
  const periodEnd = addDays(now, 30).toISOString();

  await db
    .from("profiles")
    .update({
      credits_balance: allowance,
      credits_monthly_allowance: allowance,
      credits_period_start: now.toISOString(),
      credits_period_end: periodEnd,
    })
    .eq("id", userId);

  await writeLedger(db, userId, "billing.period_reset", allowance, allowance, {
    plan,
    source: opts?.source ?? "renewal",
  });
}

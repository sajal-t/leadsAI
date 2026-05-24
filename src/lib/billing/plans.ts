/** Subscription tiers — see billing.md */

export const BILLING_PLANS = ["free", "starter", "pro", "agency"] as const;
export type BillingPlan = (typeof BILLING_PLANS)[number];

export type PlanDefinition = {
  id: BillingPlan;
  name: string;
  priceMonthlyUsd: number;
  creditsPerMonth: number;
  deepSearch: boolean;
  marketingFeatures: string[];
};

export const PLANS: Record<BillingPlan, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthlyUsd: 0,
    creditsPerMonth: 0,
    deepSearch: false,
    marketingFeatures: ["Browse dashboard", "Upgrade to run lead searches and AI tools"],
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthlyUsd: 29,
    creditsPerMonth: 600,
    deepSearch: true,
    marketingFeatures: [
      "600 credits / month",
      "Quick & deep lead searches",
      "AI scripts & website previews",
      "Pipeline & call logging",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthlyUsd: 79,
    creditsPerMonth: 2500,
    deepSearch: true,
    marketingFeatures: [
      "2,500 credits / month",
      "Deep search (multi-query)",
      "AI Studio edits",
      "Priority support",
    ],
  },
  agency: {
    id: "agency",
    name: "Agency",
    priceMonthlyUsd: 199,
    creditsPerMonth: 8000,
    deepSearch: true,
    marketingFeatures: [
      "8,000 credits / month",
      "Deep search",
      "5 seats (coming soon)",
      "Custom preview domains (coming soon)",
    ],
  },
};

export function isPaidPlan(plan: string): plan is Exclude<BillingPlan, "free"> {
  return plan === "starter" || plan === "pro" || plan === "agency";
}

export function normalizePlan(raw: string | null | undefined): BillingPlan {
  if (raw && (BILLING_PLANS as readonly string[]).includes(raw)) {
    return raw as BillingPlan;
  }
  return "free";
}

export function planAllowsDeepSearch(plan: BillingPlan): boolean {
  return PLANS[plan].deepSearch;
}

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CREDIT_COSTS, CREDIT_ACTION_LABELS, type CreditAction } from "@/lib/billing/credit-costs";
import { mockActivatePlan, startBillingPortal, startPlanCheckout } from "@/lib/billing/checkout-client";
import type { BillingPlan } from "@/lib/billing/plans";
import { useBilling } from "@/contexts/billing-context";
import { cn } from "@/lib/utils";

export function BillingSettingsPanel() {
  const searchParams = useSearchParams();
  const { billing, plans, openPaywall, refreshBilling, isLoading, stripeEnabled, mockBillingEnabled } =
    useBilling();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      setMessage("Subscription active. Your credits are ready.");
      refreshBilling();
    } else if (checkout === "cancelled") {
      setMessage("Checkout was cancelled.");
    }
  }, [searchParams, refreshBilling]);

  if (isLoading || !billing) {
    return <p className="text-sm text-neutral-500">Loading billing…</p>;
  }

  const startCheckout = async (planId: Exclude<BillingPlan, "free">) => {
    setLoading(planId);
    setMessage(null);
    const result = await startPlanCheckout(planId);
    if (!result.ok) {
      setMessage(result.error);
      setLoading(null);
      return;
    }
    window.location.href = result.url;
  };

  const openPortal = async () => {
    setLoading("portal");
    setMessage(null);
    const result = await startBillingPortal();
    if (!result.ok) {
      setMessage(result.error);
      setLoading(null);
      return;
    }
    window.location.href = result.url;
  };

  const mockActivate = async (planId: BillingPlan) => {
    setLoading(planId);
    setMessage(null);
    const result = await mockActivatePlan(planId);
    if (!result.ok) {
      setMessage(result.error ?? "Could not activate plan.");
      setLoading(null);
      return;
    }
    setMessage("Plan updated.");
    refreshBilling();
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <p className="text-sm font-medium text-neutral-900">Current plan</p>
        <p className="mt-1 text-2xl font-semibold text-neutral-900">{billing.planName}</p>
        {billing.isPaid ? (
          <p className="mt-2 text-sm text-neutral-600">
            <span className="font-medium tabular-nums text-neutral-900">{billing.creditsBalance}</span> credits
            remaining
            {billing.creditsMonthlyAllowance > 0 ? (
              <span className="text-neutral-500"> / {billing.creditsMonthlyAllowance} per month</span>
            ) : null}
          </p>
        ) : (
          <p className="mt-2 text-sm text-neutral-600">Upgrade to get monthly credits and run lead searches.</p>
        )}
        {billing.creditsPeriodEnd ? (
          <p className="mt-1 text-xs text-neutral-500">
            Period ends {new Date(billing.creditsPeriodEnd).toLocaleDateString()}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {!billing.isPaid ? (
            <Button className="rounded-full bg-primary text-white hover:bg-primary/90" onClick={openPaywall}>
              View plans
            </Button>
          ) : null}
          {billing.isPaid && billing.stripeCustomerId && stripeEnabled ? (
            <Button
              variant="outline"
              className="rounded-full border-neutral-200"
              disabled={loading != null}
              onClick={() => void openPortal()}
            >
              {loading === "portal" ? "Opening…" : "Manage subscription"}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-sm font-medium text-neutral-900">Credit costs</p>
        <ul className="mt-3 space-y-2">
          {(Object.keys(CREDIT_COSTS) as CreditAction[]).map((action) => (
            <li key={action} className="flex justify-between text-sm text-neutral-600">
              <span>{CREDIT_ACTION_LABELS[action]}</span>
              <span className="font-medium tabular-nums text-neutral-900">{CREDIT_COSTS[action]} credits</span>
            </li>
          ))}
        </ul>
      </div>

      {stripeEnabled && !billing.isPaid ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-neutral-900">Upgrade</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-lg border border-neutral-200 p-3">
                <p className="font-semibold text-neutral-900">{plan.name}</p>
                <p className="text-lg font-bold">${plan.priceMonthlyUsd}/mo</p>
                <p className="text-xs text-neutral-500">{plan.creditsPerMonth} credits</p>
                <Button
                  size="sm"
                  className="mt-2 w-full rounded-full"
                  disabled={loading != null}
                  onClick={() => void startCheckout(plan.id as "starter" | "pro" | "agency")}
                >
                  {loading === plan.id ? "…" : "Subscribe"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {mockBillingEnabled ? (
        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-4">
          <p className="text-sm font-semibold text-amber-900">Dev: mock billing</p>
          <p className="mt-1 text-xs text-amber-800">
            Enabled via <code className="rounded bg-amber-100 px-1">ALLOW_MOCK_BILLING=true</code>. Does not charge
            Stripe.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {(["starter", "pro", "agency", "free"] as BillingPlan[]).map((planId) => (
              <Button
                key={planId}
                size="sm"
                variant="outline"
                className={cn(
                  "rounded-full border-amber-200 bg-white",
                  billing.plan === planId && "border-primary",
                )}
                disabled={loading != null || billing.plan === planId}
                onClick={() => void mockActivate(planId)}
              >
                {loading === planId ? "…" : planId === "free" ? "Set free" : planId}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {message ? (
        <p
          className={cn(
            "flex items-center gap-2 text-sm",
            message.includes("active") || message.includes("updated") ? "text-neutral-700" : "text-neutral-600",
          )}
        >
          {message.includes("active") ? <Check className="h-4 w-4 text-primary" /> : null}
          {message}
        </p>
      ) : null}
    </div>
  );
}

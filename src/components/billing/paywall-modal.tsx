"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startPlanCheckout } from "@/lib/billing/checkout-client";
import { CREDIT_COSTS } from "@/lib/billing/credit-costs";
import type { PlanDefinition } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

type PaywallModalProps = {
  open: boolean;
  onClose: () => void;
  plans: PlanDefinition[];
  stripeEnabled?: boolean;
  onSubscribed?: () => void;
};

const PLAN_DESC: Record<string, string> = {
  starter: "Solo operators getting serious about outbound.",
  pro: "Growing freelancers and small agencies.",
  agency: "Teams dialing at volume with multiple seats.",
};

export function PaywallModal({
  open,
  onClose,
  plans,
  stripeEnabled = false,
  onSubscribed,
}: PaywallModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const paidPlans = plans.filter((p) => p.id !== "free");

  const subscribe = async (planId: string) => {
    if (!stripeEnabled) {
      setError("Checkout is not configured yet. Contact support to upgrade.");
      return;
    }

    setLoading(planId);
    setError(null);
    const result = await startPlanCheckout(planId as "starter" | "pro" | "agency");
    if (!result.ok) {
      setError(result.error);
      setLoading(null);
      return;
    }
    onSubscribed?.();
    window.location.href = result.url;
  };

  return (
    <div data-paywall-modal className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button type="button" className="absolute inset-0 bg-transparent" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        className="relative z-[101] flex max-h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="shrink-0 border-b border-neutral-100 px-6 pb-5 pt-8 text-center sm:px-10 sm:pt-10">
          <h2 id="paywall-title" className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            Simple pricing
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-600 sm:text-base">
            Unlock lead searches, AI scripts, and website previews with monthly credits. Start small, upgrade when
            your pipeline gets noisy.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="grid gap-5 sm:gap-6 lg:grid-cols-3 lg:items-stretch">
            {paidPlans.map((plan) => {
              const highlight = plan.id === "pro";
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col rounded-3xl p-6 sm:p-7",
                    highlight
                      ? "border-2 border-primary bg-primary/[0.04] shadow-xl shadow-primary/15"
                      : "border border-neutral-200 bg-white shadow-lg shadow-neutral-200/50",
                  )}
                >
                  {highlight ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white shadow-md">
                      Most Popular
                    </span>
                  ) : null}
                  <h3 className="text-lg font-semibold text-neutral-900">{plan.name}</h3>
                  <p className="mt-2 min-h-[2.5rem] text-sm text-neutral-500">
                    {PLAN_DESC[plan.id] ?? plan.marketingFeatures[0]}
                  </p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight text-neutral-900">${plan.priceMonthlyUsd}</span>
                    <span className="text-sm text-neutral-500">/mo</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-neutral-500">
                    {plan.creditsPerMonth.toLocaleString()} credits / month
                  </p>
                  <ul className="mt-6 flex-1 space-y-3 text-sm text-neutral-600">
                    {plan.marketingFeatures.map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={cn(
                      "mt-8 h-11 w-full rounded-2xl font-semibold",
                      highlight
                        ? "bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90"
                        : "border border-neutral-200 bg-transparent text-neutral-900 hover:bg-neutral-50",
                    )}
                    variant={highlight ? "default" : "outline"}
                    disabled={loading != null || !stripeEnabled}
                    onClick={() => void subscribe(plan.id)}
                  >
                    {loading === plan.id ? "Redirecting…" : `Choose ${plan.name}`}
                  </Button>
                </div>
              );
            })}
          </div>

          {error ? <p className="mt-4 text-center text-sm text-red-600">{error}</p> : null}

          <p className="mt-6 text-center text-xs text-neutral-500">
            Quick search {CREDIT_COSTS["lead_search.shallow"]} cr · Deep search {CREDIT_COSTS["lead_search.deep"]} cr ·
            Script {CREDIT_COSTS["script.generate"]} cr · Website {CREDIT_COSTS["site.generate"]} cr
          </p>
        </div>

        <div className="shrink-0 border-t border-neutral-100 px-6 py-4 text-center text-xs text-neutral-500 sm:px-10">
          <Link href="/dashboard/settings?tab=billing" className="text-primary hover:underline" onClick={onClose}>
            Manage billing in Settings
          </Link>
          {" · "}
          <Link href="/#pricing" className="hover:underline" onClick={onClose}>
            Compare on marketing site
          </Link>
        </div>
      </div>
    </div>
  );
}

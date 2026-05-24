"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import useSWR from "swr";
import { PaywallInteractionGuard } from "@/components/billing/paywall-interaction-guard";
import { PaywallModal } from "@/components/billing/paywall-modal";
import type { BillingState } from "@/lib/billing/billing-service";
import type { PlanDefinition } from "@/lib/billing/plans";
import type { CreditAction } from "@/lib/billing/credit-costs";
import { CREDIT_COSTS } from "@/lib/billing/credit-costs";

type BillingApiResponse = {
  billing: BillingState;
  plans: PlanDefinition[];
  creditCosts: typeof CREDIT_COSTS;
  stripeEnabled: boolean;
  mockBillingEnabled: boolean;
};

type BillingContextValue = {
  billing: BillingState | null;
  plans: PlanDefinition[];
  creditCosts: typeof CREDIT_COSTS;
  isLoading: boolean;
  showPaywall: boolean;
  paywallOpen: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
  refreshBilling: () => void;
  creditCost: (action: CreditAction) => number;
  stripeEnabled: boolean;
  mockBillingEnabled: boolean;
};

const BillingContext = createContext<BillingContextValue | null>(null);

async function billingFetcher(url: string): Promise<BillingApiResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("billing fetch failed");
  return res.json();
}

export function BillingProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, mutate } = useSWR<BillingApiResponse>("/api/billing", billingFetcher, {
    revalidateOnFocus: true,
  });

  const [paywallOpen, setPaywallOpen] = useState(false);

  const billing = data?.billing ?? null;
  const showPaywall = Boolean(billing && !billing.isPaid && !billing.billingDisabled);

  const value = useMemo<BillingContextValue>(
    () => ({
      billing,
      plans: data?.plans ?? [],
      creditCosts: data?.creditCosts ?? CREDIT_COSTS,
      isLoading,
      showPaywall,
      paywallOpen,
      openPaywall: () => setPaywallOpen(true),
      closePaywall: () => setPaywallOpen(false),
      refreshBilling: () => void mutate(),
      creditCost: (action) => data?.creditCosts?.[action] ?? CREDIT_COSTS[action],
      stripeEnabled: data?.stripeEnabled ?? false,
      mockBillingEnabled: data?.mockBillingEnabled ?? false,
    }),
    [billing, data?.plans, data?.creditCosts, data?.stripeEnabled, data?.mockBillingEnabled, isLoading, showPaywall, paywallOpen, mutate],
  );

  return (
    <BillingContext.Provider value={value}>
      <PaywallInteractionGuard
        showPaywall={showPaywall}
        isLoading={isLoading}
        paywallOpen={paywallOpen}
        openPaywall={() => setPaywallOpen(true)}
      >
        {children}
      </PaywallInteractionGuard>
      {paywallOpen && showPaywall ? (
        <>
          <div
            className="pointer-events-none fixed inset-0 z-[90] bg-neutral-900/35 backdrop-blur-md"
            aria-hidden
          />
          <PaywallModal
            open
            onClose={() => setPaywallOpen(false)}
            plans={value.plans}
            stripeEnabled={value.stripeEnabled}
            onSubscribed={() => void mutate()}
          />
        </>
      ) : null}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBilling must be used within BillingProvider");
  return ctx;
}

export function useBillingOptional() {
  return useContext(BillingContext);
}

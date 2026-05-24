"use client";

import Link from "next/link";
import { useBilling } from "@/contexts/billing-context";
import { cn } from "@/lib/utils";

export function CreditsBadge({ className }: { className?: string }) {
  const { billing, showPaywall, openPaywall, isLoading } = useBilling();

  if (isLoading || !billing) return null;

  if (showPaywall) {
    return (
      <button
        type="button"
        data-paywall-exempt
        onClick={openPaywall}
        className={cn(
          "rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/15",
          className,
        )}
      >
        Upgrade
      </button>
    );
  }

  return (
    <Link
      href="/dashboard/settings"
      className={cn(
        "rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50",
        className,
      )}
      title={billing.creditsPeriodEnd ? `Resets ${new Date(billing.creditsPeriodEnd).toLocaleDateString()}` : undefined}
    >
      <span className="text-neutral-500">{billing.planName}</span>
      <span className="mx-1.5 text-neutral-300">·</span>
      <span className="tabular-nums text-neutral-900">{billing.creditsBalance.toLocaleString()} credits</span>
    </Link>
  );
}

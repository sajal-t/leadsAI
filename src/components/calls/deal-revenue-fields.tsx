"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  setupFee: string;
  monthlyFee: string;
  onSetupFeeChange: (v: string) => void;
  onMonthlyFeeChange: (v: string) => void;
  compact?: boolean;
};

export function DealRevenueFields({
  setupFee,
  monthlyFee,
  onSetupFeeChange,
  onMonthlyFeeChange,
  compact,
}: Props) {
  return (
    <div className={compact ? "grid gap-3 sm:grid-cols-2" : "space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4"}>
      {!compact && (
        <p className="text-sm font-medium text-emerald-950 sm:col-span-2">How much did you make on this client?</p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="setup-fee" className="text-xs text-neutral-600">
          Setup / one-time ($)
        </Label>
        <Input
          id="setup-fee"
          type="text"
          inputMode="decimal"
          placeholder="e.g. 1500"
          value={setupFee}
          onChange={(e) => onSetupFeeChange(e.target.value)}
          className="rounded-lg border-neutral-200 bg-white"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="monthly-fee" className="text-xs text-neutral-600">
          Monthly / MRR ($)
        </Label>
        <Input
          id="monthly-fee"
          type="text"
          inputMode="decimal"
          placeholder="e.g. 99"
          value={monthlyFee}
          onChange={(e) => onMonthlyFeeChange(e.target.value)}
          className="rounded-lg border-neutral-200 bg-white"
        />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DealRevenueFields } from "@/components/calls/deal-revenue-fields";
import { formatMoney } from "@/lib/deal-revenue";

type Props = {
  businessId: string;
  businessName: string;
  initialSetup?: number;
  initialMonthly?: number;
  triggerLabel?: string;
  variant?: "outline" | "secondary";
  size?: "sm" | "default";
};

export function EditDealRevenueDialog({
  businessId,
  businessName,
  initialSetup = 0,
  initialMonthly = 0,
  triggerLabel = "Add revenue",
  variant = "outline",
  size = "sm",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [setupFee, setSetupFee] = useState(initialSetup > 0 ? String(initialSetup) : "");
  const [monthlyFee, setMonthlyFee] = useState(initialMonthly > 0 ? String(initialMonthly) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDialog = () => {
    setSetupFee(initialSetup > 0 ? String(initialSetup) : "");
    setMonthlyFee(initialMonthly > 0 ? String(initialMonthly) : "");
    setError(null);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/revenue`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setup_fee: setupFee,
          monthly_fee: monthlyFee,
          mark_won: true,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Could not save");
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const previewTotal = (() => {
    const s = Number.parseFloat(setupFee.replace(/[^0-9.]/g, "")) || 0;
    const m = Number.parseFloat(monthlyFee.replace(/[^0-9.]/g, "")) || 0;
    return s + m;
  })();

  return (
    <>
      <Button type="button" variant={variant} size={size} className="rounded-full border-neutral-200" onClick={openDialog}>
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revenue — {businessName}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-500">Counts toward your dashboard revenue total.</p>
          <DealRevenueFields
            setupFee={setupFee}
            monthlyFee={monthlyFee}
            onSetupFeeChange={setSetupFee}
            onMonthlyFeeChange={setMonthlyFee}
          />
          {previewTotal > 0 && (
            <p className="text-sm text-neutral-700">
              First month value: <span className="font-semibold text-neutral-900">{formatMoney(previewTotal)}</span>
              {Number.parseFloat(monthlyFee.replace(/[^0-9.]/g, "")) > 0 && (
                <span className="text-neutral-500"> (+ {formatMoney(Number.parseFloat(monthlyFee.replace(/[^0-9.]/g, "")))}/mo after)</span>
              )}
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="button"
            disabled={saving}
            className="w-full rounded-full bg-neutral-900 text-white hover:bg-neutral-800"
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save revenue"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DealRevenueFields } from "@/components/calls/deal-revenue-fields";

const schema = z.object({
  business_id: z.string().uuid(),
  outcome: z.enum([
    "no_answer",
    "voicemail",
    "interested",
    "callback",
    "meeting_booked",
    "closed_won",
    "not_interested",
    "send_info",
    "other",
  ]),
  notes: z.string().optional(),
  follow_up_date: z.string().optional(),
  setup_fee: z.string().optional(),
  monthly_fee: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const outcomes: { value: FormValues["outcome"]; label: string }[] = [
  { value: "interested", label: "Interested" },
  { value: "callback", label: "Callback" },
  { value: "meeting_booked", label: "Meeting booked" },
  { value: "closed_won", label: "Closed — won client" },
  { value: "no_answer", label: "No answer" },
  { value: "voicemail", label: "Voicemail" },
  { value: "not_interested", label: "Not interested" },
  { value: "send_info", label: "Send info" },
  { value: "other", label: "Other" },
];

export function LogCallDialog({ businesses }: { businesses: { id: string; name: string; phone: string | null }[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      business_id: businesses[0]?.id ?? "",
      outcome: "interested",
      notes: "",
      follow_up_date: "",
      setup_fee: "",
      monthly_fee: "",
    },
  });

  const outcome = form.watch("outcome");
  const showRevenue = outcome === "closed_won";

  const onSubmit = form.handleSubmit(async (values) => {
    const res = await fetch("/api/call-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id: values.business_id,
        outcome: values.outcome,
        notes: values.notes || null,
        answered: values.outcome !== "no_answer" && values.outcome !== "voicemail",
        setup_fee: showRevenue ? values.setup_fee : undefined,
        monthly_fee: showRevenue ? values.monthly_fee : undefined,
        metadata: values.follow_up_date ? { follow_up_date: values.follow_up_date } : undefined,
      }),
    });
    if (!res.ok) {
      form.setError("root", { message: "Could not save call" });
      return;
    }
    setOpen(false);
    form.reset({
      business_id: values.business_id,
      outcome: "interested",
      notes: "",
      follow_up_date: "",
      setup_fee: "",
      monthly_fee: "",
    });
    router.refresh();
  });

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="rounded-full bg-neutral-900 text-white hover:bg-neutral-800">
        Log new call
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log call</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Business</Label>
              <select
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...form.register("business_id")}
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Outcome</Label>
              <select
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...form.register("outcome")}
              >
                {outcomes.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {showRevenue && (
              <DealRevenueFields
                compact
                setupFee={form.watch("setup_fee") ?? ""}
                monthlyFee={form.watch("monthly_fee") ?? ""}
                onSetupFeeChange={(v) => form.setValue("setup_fee", v)}
                onMonthlyFeeChange={(v) => form.setValue("monthly_fee", v)}
              />
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea {...form.register("notes")} className="rounded-lg border-neutral-200" rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Follow-up date (optional)</Label>
              <Input type="date" {...form.register("follow_up_date")} className="rounded-lg border-neutral-200" />
            </div>
            {form.formState.errors.root && <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>}
            <Button type="submit" className="w-full rounded-full bg-neutral-900 text-white hover:bg-neutral-800">
              Save call log
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

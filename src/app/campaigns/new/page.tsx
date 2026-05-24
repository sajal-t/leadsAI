"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import {
  LocationMapPicker,
  type CampaignLocationValue,
} from "@/components/campaigns/location-map-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeepSearchToggle } from "@/components/campaigns/deep-search-toggle";
import { useBillingOptional } from "@/contexts/billing-context";

export default function NewCampaignPage() {
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState<CampaignLocationValue | null>(null);
  const [maxSampleSize, setMaxSampleSize] = useState("500");
  const [deepSearch, setDeepSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const billingCtx = useBillingOptional();
  const billing = billingCtx?.billing;
  const showPaywall = billingCtx?.showPaywall ?? false;
  const openPaywall = billingCtx?.openPaywall ?? (() => {});

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location?.label.trim()) {
      setMessage("Choose a search area on the map or from search results.");
      return;
    }

    if (showPaywall) {
      openPaywall();
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const sample = Number(maxSampleSize);
      const campaignRes = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          city: location.label,
          deep_search: deepSearch,
          maxSampleSize: Number.isFinite(sample) && sample >= 60 ? sample : 500,
        }),
      });
      if (!campaignRes.ok) {
        const err = (await campaignRes.json().catch(() => null)) as { error?: string; code?: string } | null;
        if (campaignRes.status === 402 && err?.code === "paywall") {
          openPaywall();
          return;
        }
        setMessage(err?.error ? `Failed to create campaign: ${err.error}` : "Failed to create campaign.");
        return;
      }

      const campaign = await campaignRes.json();
      router.push(`/campaigns/${campaign.id}?finding=1`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unexpected error";
      setMessage(`Something went wrong: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  const messageIsError =
    message &&
    (message.toLowerCase().includes("failed") ||
      message.toLowerCase().includes("wrong") ||
      message.includes("Choose"));

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl">
        <PageHeader
          title="New campaign"
          subtitle="Choose where to search, your niche, and how many qualified leads to save."
        />

        <Card className="rounded-xl border-neutral-200 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <form className="space-y-5" onSubmit={onSubmit}>
              <LocationMapPicker value={location} onChange={setLocation} disabled={loading} />

              <DeepSearchToggle
                enabled={deepSearch}
                onChange={setDeepSearch}
                disabled={loading}
                allowed={billing?.deepSearchAllowed ?? false}
              />

              <div className="grid gap-4 border-t border-neutral-100 pt-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="niche">Niche</Label>
                  <Input
                    id="niche"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="Dentists, restaurants, plumbers…"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxSampleSize">Leads to save</Label>
                  <Input
                    id="maxSampleSize"
                    value={maxSampleSize}
                    onChange={(e) => setMaxSampleSize(e.target.value)}
                    type="number"
                    min={60}
                    max={2000}
                    placeholder="500"
                  />
                  <p className="text-xs text-neutral-500">Between 60 and 2,000.</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-neutral-900 text-white hover:bg-neutral-800 sm:w-auto sm:min-w-[180px]"
                >
                  {loading ? "Creating…" : "Start lead search"}
                </Button>
                <p className="text-center text-xs text-neutral-500 sm:text-right">
                  Finds businesses without a real website in your area.
                </p>
              </div>

              {message ? (
                <p className={`text-sm ${messageIsError ? "text-red-600" : "text-neutral-600"}`}>{message}</p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

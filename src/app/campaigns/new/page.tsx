"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewCampaignPage() {
  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("Creating campaign...");
    try {
      const campaignRes = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, city, radius: radius ? Number(radius) : null }),
      });
      if (!campaignRes.ok) {
        const err = await campaignRes.json().catch(() => null);
        setMessage(err?.error ? `Failed to create campaign: ${err.error}` : "Failed to create campaign.");
        return;
      }

      const campaign = await campaignRes.json();
      setMessage("Finding leads...");

      const leadsRes = await fetch(`/api/campaigns/${campaign.id}/find-leads`, {
        method: "POST",
      });
      if (!leadsRes.ok) {
        const err = await leadsRes.json().catch(() => null);
        setMessage(
          err?.error
            ? `Campaign created, but lead fetch failed: ${err.error}`
            : "Campaign created, but lead fetch failed.",
        );
        return;
      }
      const leadsPayload = await leadsRes.json().catch(() => null);
      if (typeof leadsPayload?.noWebsiteCount === "number" && leadsPayload.noWebsiteCount === 0) {
        setMessage("No 'No website found' leads in this search. Showing other matches in the campaign.");
      }

      router.push(`/campaigns/${campaign.id}`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unexpected error";
      setMessage(`Something went wrong: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create campaign</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>Niche</Label>
              <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Dentists" required />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bothell, WA" required />
            </div>
            <div className="space-y-2">
              <Label>Radius (optional)</Label>
              <Input value={radius} onChange={(e) => setRadius(e.target.value)} type="number" />
            </div>
            <Button disabled={loading}>{loading ? "Finding..." : "Find Leads"}</Button>
            {message && (
              <p className={`text-sm ${message.toLowerCase().includes("failed") || message.toLowerCase().includes("wrong") ? "text-red-600" : "text-zinc-600"}`}>
                {message}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

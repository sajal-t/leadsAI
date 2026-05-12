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
  const [maxSampleSize, setMaxSampleSize] = useState("500");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("Creating campaign...");
    try {
      const sample = Number(maxSampleSize);
      const campaignRes = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          city,
          radius: radius ? Number(radius) : null,
          maxSampleSize: Number.isFinite(sample) && sample >= 60 ? sample : 500,
        }),
      });
      if (!campaignRes.ok) {
        const err = await campaignRes.json().catch(() => null);
        setMessage(err?.error ? `Failed to create campaign: ${err.error}` : "Failed to create campaign.");
        return;
      }

      const campaign = await campaignRes.json();
      // Redirect immediately; heavy Google work runs on campaign page (?finding=1) so the browser does not stall here.
      router.push(`/campaigns/${campaign.id}?finding=1`);
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
            <div className="space-y-2">
              <Label>Target sample size</Label>
              <Input
                value={maxSampleSize}
                onChange={(e) => setMaxSampleSize(e.target.value)}
                type="number"
                min={60}
                max={2000}
                placeholder="500"
              />
              <p className="text-xs text-zinc-500">
                Max unique businesses to merge from Google (60–2000). Each text query returns ~60; we combine multiple
                searches until this target or results run out.
              </p>
            </div>
            <Button disabled={loading}>{loading ? "Creating…" : "Find Leads"}</Button>
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

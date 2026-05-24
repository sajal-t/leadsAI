"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type RecentCampaign = {
  id: string;
  niche: string;
  city: string;
};

export function RecentCampaignsCard({ campaigns }: { campaigns: RecentCampaign[] }) {
  const router = useRouter();
  const [clearing, setClearing] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const clearAll = async () => {
    if (campaigns.length === 0) return;
    const confirmed = window.confirm(
      "Delete all your campaigns? This removes every lead, call log, generated script, website preview, AI studio data, and deal tied to those campaigns. You cannot undo this.",
    );
    if (!confirmed) return;

    setClearing(true);
    setBanner(null);
    try {
      const res = await fetch("/api/campaigns", { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Could not clear campaigns.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <CardTitle>Recent campaigns</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={campaigns.length === 0 || clearing}
          onClick={() => void clearAll()}
          className="shrink-0 border-red-200 text-red-800 hover:bg-red-50"
        >
          {clearing ? "Clearing…" : "Clear campaigns"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {banner && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {banner}
          </p>
        )}
        {campaigns.map((campaign) => (
          <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className="block rounded border p-3 hover:bg-zinc-50">
            {campaign.niche} in {campaign.city}
          </Link>
        ))}
        {campaigns.length === 0 && <p className="text-sm text-zinc-500">No campaigns yet.</p>}
      </CardContent>
    </Card>
  );
}

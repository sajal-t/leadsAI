"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

function FindLeadsRunnerInner({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const finding = searchParams.get("finding") === "1";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!finding) return;
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/find-leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null;
          if (!cancelled) setError(err?.error ?? `Request failed (${res.status})`);
          return;
        }
        if (!cancelled) {
          router.replace(`/campaigns/${campaignId}`);
          router.refresh();
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Network error");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [finding, campaignId, router]);

  const dismiss = () => {
    router.replace(`/campaigns/${campaignId}`);
    router.refresh();
  };

  if (!finding) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
        <p className="font-semibold text-zinc-900">{error ? "Could not finish lead search" : "Finding leads…"}</p>
        {!error && (
          <p className="mt-2 text-sm text-zinc-600">
            Google is queried many times for large sample sizes. This often takes 1–5 minutes. You can leave this tab
            open.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {error && (
          <Button className="mt-4 w-full" variant="outline" onClick={dismiss}>
            Continue to campaign
          </Button>
        )}
      </div>
    </div>
  );
}

export function FindLeadsRunner({ campaignId }: { campaignId: string }) {
  return (
    <Suspense fallback={null}>
      <FindLeadsRunnerInner campaignId={campaignId} />
    </Suspense>
  );
}

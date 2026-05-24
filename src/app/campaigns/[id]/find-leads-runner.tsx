"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DiscoveryProgressBar } from "@/components/campaigns/discovery-progress-bar";
import { Button } from "@/components/ui/button";
import { useCreepingProgress } from "@/hooks/use-creeping-progress";
import { userFacingDiscoveryError } from "@/lib/product-copy";

type JobState = {
  status?: string;
  stage?: string;
  progress?: number;
  error?: string | null;
  meta?: {
    search_mode?: string;
    scrape_query_count?: number;
  };
};

function FindLeadsRunnerInner({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const finding = searchParams.get("finding") === "1";
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<JobState | null>(null);

  useEffect(() => {
    if (!finding) return;
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/find-leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const payload = (await res.json().catch(() => null)) as Record<string, unknown> | null;
        if (!res.ok) {
          if (!cancelled) {
            setError(
              typeof payload?.error === "string" ? userFacingDiscoveryError(payload.error) : "Lead search failed.",
            );
          }
          return;
        }

        if (payload?.sync === true) {
          if (!cancelled) {
            router.replace(`/campaigns/${campaignId}`);
            router.refresh();
          }
          return;
        }

        const jobId = typeof payload?.jobId === "string" ? payload.jobId : null;
        if (!jobId) {
          if (!cancelled) setError("Could not start lead search. Please try again.");
          return;
        }

        for (let i = 0; i < 240; i += 1) {
          if (cancelled) return;
          await new Promise((r) => setTimeout(r, 2000));
          const st = await fetch(`/api/campaigns/${campaignId}/discovery-jobs/${jobId}`);
          const j = (await st.json().catch(() => null)) as JobState | null;
          if (!j || cancelled) return;
          setJob(j);
          if (j.status === "failed") {
            if (!cancelled) setError(userFacingDiscoveryError(j.error));
            return;
          }
          if (j.status === "completed") {
            if (!cancelled) {
              router.replace(`/campaigns/${campaignId}`);
              router.refresh();
            }
            return;
          }
        }
        if (!cancelled) setError("Still working on this. Refresh the page in a minute to see new leads.");
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

  const retry = () => {
    router.replace(`/campaigns/${campaignId}?finding=1`);
    router.refresh();
  };

  if (!finding) return null;

  const serverProgress = typeof job?.progress === "number" ? job.progress : 0;
  const hasProgress = serverProgress > 0;
  const isRunning = !error && job?.status !== "completed" && job?.status !== "failed";
  const displayProgress = useCreepingProgress(serverProgress, isRunning && finding);
  const isDeep = job?.meta?.search_mode === "deep";
  const queryCount = job?.meta?.scrape_query_count;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-xl">
        {error ? (
          <>
            <p className="font-semibold tracking-tight text-neutral-900">Lead search failed</p>
            <p className="mt-3 text-sm text-red-600">{error}</p>
            <div className="mt-5 flex flex-col gap-2">
              <Button className="w-full rounded-full bg-neutral-900 text-white hover:bg-neutral-800" onClick={retry}>
                Try again
              </Button>
              <Button className="w-full rounded-full border-neutral-200" variant="outline" onClick={dismiss}>
                Continue to campaign
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="font-semibold tracking-tight text-neutral-900">Finding leads…</p>
                <p className="mt-0.5 text-sm text-neutral-500">
                  {isDeep
                    ? `Deep search — ${queryCount ?? "several"} Maps queries, then qualifying leads. This may take longer.`
                    : "Quick search — one Maps query (~100 listings). This may take a few minutes."}
                </p>
              </div>
            </div>
            <div className="mt-6">
              <DiscoveryProgressBar
                progress={displayProgress}
                stage={job?.stage}
                indeterminate={!hasProgress}
              />
            </div>
          </>
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

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  businessId: string;
  previewSlug: string | null;
  studioProjectId: string | null;
};

export function BusinessSiteActions({ businessId, previewSlug, studioProjectId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openStudioAndGenerate = async () => {
    setBusy(true);
    setError(null);
    try {
      const sessionRes = await fetch(`/api/businesses/${businessId}/studio-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const sessionData = await sessionRes.json().catch(() => null);
      if (!sessionRes.ok) {
        throw new Error(typeof sessionData?.error === "string" ? sessionData.error : `Failed (${sessionRes.status})`);
      }
      const projectId = sessionData?.project_id as string | undefined;
      if (!projectId) {
        throw new Error("No studio project returned.");
      }

      router.push(`/studio/${projectId}?gen=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open AI Studio.");
    } finally {
      setBusy(false);
    }
  };

  const copyPreview = async () => {
    if (!previewSlug) return;
    const url = `${window.location.origin}/preview/${previewSlug}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      setError("Could not copy preview link.");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="rounded-full bg-neutral-900 text-white hover:bg-neutral-800"
          disabled={busy}
          onClick={() => void openStudioAndGenerate()}
        >
          {busy ? "Opening studio…" : "Generate with AI Studio"}
        </Button>
        {studioProjectId && (
          <Link href={`/studio/${studioProjectId}`}>
            <Button variant="outline" className="rounded-full border-neutral-200">
              Open AI Studio
            </Button>
          </Link>
        )}
        {previewSlug && (
          <>
            <a href={`/preview/${previewSlug}`} target="_blank" rel="noreferrer">
              <Button variant="outline" className="rounded-full border-neutral-200">
                Open preview
              </Button>
            </a>
            <Button type="button" variant="outline" className="rounded-full border-neutral-200" onClick={() => void copyPreview()}>
              Copy preview link
            </Button>
          </>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

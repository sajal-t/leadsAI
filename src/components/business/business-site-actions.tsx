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
        <Button type="button" className="bg-sky-600 hover:bg-sky-700" disabled={busy} onClick={() => void openStudioAndGenerate()}>
          {busy ? "Opening studio…" : "Generate with AI Studio"}
        </Button>
        {studioProjectId && (
          <Link href={`/studio/${studioProjectId}`}>
            <Button variant="outline">Open AI Studio</Button>
          </Link>
        )}
        {previewSlug && (
          <>
            <a href={`/preview/${previewSlug}`} target="_blank" rel="noreferrer">
              <Button variant="secondary">Open preview</Button>
            </a>
            <Button type="button" variant="outline" onClick={() => void copyPreview()}>
              Copy preview link
            </Button>
          </>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

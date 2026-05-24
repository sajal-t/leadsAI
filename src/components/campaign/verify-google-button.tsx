"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function VerifyGoogleButton({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onClick = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/verify-google`, { method: "POST" });
      const j = (await res.json().catch(() => null)) as { error?: string; creditsUsed?: number } | null;
      if (!res.ok) {
        setMessage(j?.error ?? `Failed (${res.status})`);
        return;
      }
      setMessage(`Verified (credits used: ${j?.creditsUsed ?? "—"}). Refreshing…`);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full border-amber-200 text-amber-900 hover:bg-amber-50"
        disabled={loading}
        onClick={() => void onClick()}
      >
        {loading ? "Verifying…" : "Verify with Google"}
      </Button>
      {message && <p className="text-xs text-neutral-600">{message}</p>}
      <p className="text-[10px] text-neutral-500">Paid lookup · counts toward your daily limits</p>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ANGLE_UI_OPTIONS } from "@/lib/script-prompts";
import { cn } from "@/lib/utils";

type Props = {
  businessId: string;
  activeScriptId: string | null;
};

export function ScriptWorkspaceActions({ businessId, activeScriptId }: Props) {
  const router = useRouter();
  const [angle, setAngle] = useState("auto");
  const [loading, setLoading] = useState<"new" | "regen" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (mode: "new" | "regenerate") => {
    setLoading(mode === "new" ? "new" : "regen");
    setError(null);
    try {
      const body: Record<string, unknown> =
        mode === "new"
          ? { mode: "new" }
          : {
              mode: "regenerate",
              previous_script_id: activeScriptId,
              angle: angle === "auto" ? undefined : angle,
            };
      if (mode === "regenerate" && !activeScriptId) {
        setError("Generate a script first.");
        setLoading(null);
        return;
      }
      const res = await fetch(`/api/businesses/${businessId}/generate-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setError(err?.error ?? `Failed (${res.status})`);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Script</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void run("new")}
              disabled={loading !== null}
              className="rounded-full bg-neutral-900 text-white hover:bg-neutral-800"
            >
              {loading === "new" ? "Generating…" : "Generate script"}
            </Button>
            {activeScriptId && (
              <Button
                type="button"
                variant="outline"
                disabled={loading !== null}
                onClick={() => void run("regenerate")}
                className="rounded-full border-neutral-200 bg-white"
              >
                {loading === "regen" ? "Regenerating…" : "Regenerate"}
              </Button>
            )}
          </div>
        </div>

        {activeScriptId && (
          <div className="w-full min-w-[200px] max-w-md space-y-1.5 sm:w-auto">
            <Label htmlFor="script-angle" className="text-xs font-medium text-neutral-600">
              Regeneration angle
            </Label>
            <select
              id="script-angle"
              className={cn(
                "h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 shadow-sm",
                "focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
              )}
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
            >
              {ANGLE_UI_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] leading-snug text-neutral-500">
              Regenerate keeps the same facts but rewrites shorter, more direct, or friendlier.
            </p>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}
    </div>
  );
}

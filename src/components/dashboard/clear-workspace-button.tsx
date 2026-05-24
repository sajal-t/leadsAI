"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ClearWorkspaceButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canClear = confirmText === "CLEAR";

  const handleClear = async () => {
    if (!canClear) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/clear-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "CLEAR" }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not clear workspace.");
        return;
      }
      setOpen(false);
      setConfirmText("");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={compact ? "sm" : "default"}
        className={
          compact
            ? "text-red-600 hover:bg-red-50 hover:text-red-700"
            : "rounded-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
        }
        onClick={() => {
          setError(null);
          setConfirmText("");
          setOpen(true);
        }}
      >
        {!compact && <Trash2 className="mr-2 h-4 w-4" aria-hidden />}
        Clear workspace
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Clear workspace?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">
            This permanently deletes all your campaigns, leads, call logs, deals, scripts, website previews, and
            discovery history. Your account stays signed in.
          </p>
          <div className="mt-4 space-y-2">
            <Label htmlFor="clear-confirm">Type CLEAR to confirm</Label>
            <Input
              id="clear-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="CLEAR"
              autoComplete="off"
            />
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full bg-red-600 text-white hover:bg-red-700"
              disabled={!canClear || loading}
              onClick={() => void handleClear()}
            >
              {loading ? "Clearing…" : "Delete everything"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

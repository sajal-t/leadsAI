"use client";

import { DEEP_QUERY_VARIANTS_DEFAULT } from "@/lib/lead-discovery/search-mode";

type DeepSearchToggleProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  /** Paid plans only (uses 20 credits per run). */
  allowed?: boolean;
};

export function DeepSearchToggle({ enabled, onChange, disabled, allowed = true }: DeepSearchToggleProps) {
  const subtitle = !allowed
    ? "Upgrade to a paid plan to use deep search (20 credits per run)."
    : enabled
    ? `Runs ~${DEEP_QUERY_VARIANTS_DEFAULT} Maps searches, merges results, then finds businesses without websites. Usually 250–400+ reviewed (longer run).`
    : "Quick search — one Maps query (~100 listings reviewed). Best for a fast sample.";

  return (
    <label
      className={`flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 ${allowed ? "cursor-pointer" : "opacity-70"}`}
    >
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-neutral-300 accent-[#6366f1]"
        checked={enabled && allowed}
        disabled={disabled || !allowed}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0 flex-1">
        <span className="font-medium text-neutral-900">Deep search</span>
        <p className="mt-1 text-xs leading-relaxed text-neutral-600">{subtitle}</p>
      </span>
    </label>
  );
}

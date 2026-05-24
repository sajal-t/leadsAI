"use client";

import { discoveryJobStepLabel } from "@/lib/product-copy";
import { cn } from "@/lib/utils";

type DiscoveryProgressBarProps = {
  progress?: number;
  stage?: string;
  indeterminate?: boolean;
  className?: string;
};

export function DiscoveryProgressBar({
  progress = 0,
  stage,
  indeterminate = false,
  className,
}: DiscoveryProgressBarProps) {
  const pct = indeterminate ? 0 : Math.min(100, Math.max(0, progress));
  const step = discoveryJobStepLabel(stage);
  const showPct = !indeterminate && pct > 0;

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="truncate font-medium text-neutral-700">{step}</span>
        {showPct ? <span className="shrink-0 tabular-nums font-semibold text-primary">{pct}%</span> : null}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-primary/10">
        {indeterminate ? (
          <div
            className="discovery-progress-indeterminate h-full w-2/5 rounded-full bg-primary"
            role="progressbar"
            aria-valuetext="In progress"
          />
        ) : (
          <div
            className="h-full rounded-full bg-primary shadow-sm shadow-primary/30 transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(pct, pct > 0 ? 6 : 0)}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        )}
      </div>
    </div>
  );
}

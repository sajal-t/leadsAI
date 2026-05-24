"use client";

import { cn } from "@/lib/utils";
import { PreviewFrame } from "@/components/preview/preview-frame";

type StudioPreviewChromeProps = {
  html: string;
  previewUrl?: string | null;
  viewMode?: "desktop" | "mobile";
  className?: string;
  overlay?: React.ReactNode;
};

export function StudioPreviewChrome({
  html,
  previewUrl,
  viewMode = "desktop",
  className,
  overlay,
}: StudioPreviewChromeProps) {
  const displayUrl = previewUrl ?? "preview.leadforge.app";

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)]">
        <div className="flex shrink-0 items-center gap-3 border-b border-neutral-100 bg-neutral-50/90 px-4 py-2.5">
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="min-w-0 flex-1 rounded-md border border-neutral-200/80 bg-white px-3 py-1 text-center text-[11px] text-neutral-500">
            <span className="truncate">{displayUrl}</span>
          </div>
        </div>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden bg-neutral-100",
            viewMode === "mobile" && "items-center px-2 py-2",
          )}
        >
          <div
            className={cn(
              "relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-white",
              viewMode === "mobile" && "max-w-[390px] shadow-lg",
            )}
          >
            <div className="relative min-h-0 flex-1">
              <PreviewFrame html={html} title="Studio preview" fullscreen className="absolute inset-0 size-full" />
            </div>
            {overlay}
          </div>
        </div>
      </div>
    </div>
  );
}

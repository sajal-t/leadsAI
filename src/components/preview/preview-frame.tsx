"use client";

import { cn } from "@/lib/utils";

type Props = {
  html: string;
  title?: string;
  className?: string;
  /** Edge-to-edge iframe with no min-height or border — used on /preview routes */
  fullscreen?: boolean;
};

export function PreviewFrame({ html, title = "Preview", className, fullscreen }: Props) {
  return (
    <iframe
      title={title}
      srcDoc={html}
      sandbox="allow-scripts allow-forms allow-popups"
      className={cn(
        fullscreen
          ? "block h-full min-h-0 w-full border-0 bg-white"
          : "h-full min-h-[420px] w-full rounded-md border border-zinc-200 bg-white",
        className,
      )}
    />
  );
}

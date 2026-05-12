"use client";

type Props = {
  html: string;
  title?: string;
};

export function PreviewFrame({ html, title = "Preview" }: Props) {
  return (
    <iframe
      title={title}
      srcDoc={html}
      sandbox="allow-scripts allow-forms allow-popups"
      className="h-full min-h-[420px] w-full rounded-md border border-zinc-200 bg-white"
    />
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PreviewFrame } from "@/components/preview/preview-frame";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { buildPreviewDocumentFromFiles } from "@/lib/ai/build-preview-html";
import { extractStreamingHtmlDocument } from "@/lib/ai/extract-model-html";
import type { AiWebsiteFile } from "@/lib/ai/parse-website-files";
import type { StudioPayload } from "@/lib/studio-load";
import { consumeWebsiteSse } from "@/lib/website-stream-consumer";

type Message = { id: string; role: string; content: string; created_at: string };

/** Min time between iframe `srcDoc` refreshes while the model streams HTML (reduces flicker / work). */
const STUDIO_LIVE_PREVIEW_THROTTLE_MS = 25_000;

const QUICK_PROMPTS = [
  "Make it more modern",
  "Add a pricing section",
  "Make the hero more premium",
  "Change colors to blue and white",
  "Add a stronger CTA",
  "Make it feel more local",
];

function sortPaths(paths: string[]): string[] {
  const order = ["index.html", "style.css", "styles.css", "script.js", "main.js"];
  return [...paths].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
    return a.localeCompare(b);
  });
}

function pickEditorPath(files: AiWebsiteFile[]): { path: string; content: string } {
  const paths = sortPaths(files.map((f) => f.path));
  const first = paths[0] ?? "index.html";
  const path = paths.includes("index.html") ? "index.html" : first;
  const content = files.find((f) => f.path === path)?.content ?? "";
  return { path, content };
}

export function AiStudioWorkspace({ projectId, initial }: { projectId: string; initial: StudioPayload }) {
  const router = useRouter();
  const start = pickEditorPath(initial.files);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState(initial.project.name);
  const [businessId] = useState<string | null>(initial.project.business_id);
  const [businessName] = useState(initial.business?.name ?? "");
  const [previewSlug, setPreviewSlug] = useState<string | null>(initial.preview_slug);
  const [files, setFiles] = useState<AiWebsiteFile[]>(initial.files);
  const [messages, setMessages] = useState<Message[]>(initial.messages);
  const [activePath, setActivePath] = useState<string>(start.path);
  const [editorContent, setEditorContent] = useState(start.content);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [streamingPhase, setStreamingPhase] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  /** Throttled partial HTML for initial full-page generation (iframe srcDoc). */
  const [livePreviewHtml, setLivePreviewHtml] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pendingInitialGenRef = useRef(false);

  const refresh = useCallback(async (keepPath: string | null = null) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/ai-studio/projects/${projectId}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to load studio");
      }
      setProjectName(data.project?.name ?? "Project");
      setPreviewSlug(data.preview_slug ?? null);
      const nextFiles: AiWebsiteFile[] = (data.files ?? []).map((f: { path: string; language: string; content: string }) => ({
        path: f.path,
        language: f.language,
        content: f.content,
      }));
      setFiles(nextFiles);
      setMessages(data.messages ?? []);
      const paths = sortPaths(nextFiles.map((f) => f.path));
      const first = paths[0] ?? "index.html";
      const pick = keepPath && paths.includes(keepPath) ? keepPath : first;
      setActivePath(pick);
      setEditorContent(nextFiles.find((f) => f.path === pick)?.content ?? "");
      setDirty(false);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (typeof window === "undefined" || !businessId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("gen") !== "1") return;

    router.replace(`/studio/${projectId}`, { scroll: false });

    const lockKey = `locallead-studio-gen-lock-${projectId}`;
    let acquiredLock = false;
    try {
      if (sessionStorage.getItem(lockKey)) return;
      sessionStorage.setItem(lockKey, "1");
      acquiredLock = true;
    } catch {
      if (pendingInitialGenRef.current) return;
      pendingInitialGenRef.current = true;
    }

    const releaseLock = () => {
      if (acquiredLock) {
        try {
          sessionStorage.removeItem(lockKey);
        } catch {
          /* ignore */
        }
      } else {
        pendingInitialGenRef.current = false;
      }
    };

    void (async () => {
      setAiBusy(true);
      setStreamingPhase("Thinking...");
      setStreamingText("");
      setLivePreviewHtml(null);
      setBanner(null);
      let genBuf = "";
      let genFlushTimer: ReturnType<typeof setTimeout> | null = null;
      const scheduleGenPreviewFlush = () => {
        if (genFlushTimer != null) return;
        genFlushTimer = setTimeout(() => {
          genFlushTimer = null;
          setLivePreviewHtml(extractStreamingHtmlDocument(genBuf));
        }, STUDIO_LIVE_PREVIEW_THROTTLE_MS);
      };
      try {
        const res = await fetch(`/api/businesses/${businessId}/generate-site`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({}),
        });
        await consumeWebsiteSse(res, {
          onPhase: (message) => setStreamingPhase(message),
          onDelta: (chunk) => {
            genBuf += chunk;
            setStreamingText((t) => t + chunk);
            scheduleGenPreviewFlush();
          },
          onComplete: async (payload) => {
            if (genFlushTimer != null) {
              clearTimeout(genFlushTimer);
              genFlushTimer = null;
            }
            setLivePreviewHtml(null);
            const nextFiles: AiWebsiteFile[] = (payload.files ?? []).map((f) => ({
              path: f.path,
              language: f.language,
              content: f.content,
            }));
            if (nextFiles.length > 0) {
              setFiles(nextFiles);
              const pick = nextFiles.some((f) => f.path === "index.html") ? "index.html" : nextFiles[0]!.path;
              const cur = nextFiles.find((f) => f.path === pick);
              setActivePath(pick);
              if (cur) setEditorContent(cur.content);
            }
            if (payload.project_name) setProjectName(payload.project_name);
            if (payload.preview_slug != null) setPreviewSlug(payload.preview_slug);
            setDirty(false);
            await refresh(null);
          },
          onError: (message) => {
            if (genFlushTimer != null) {
              clearTimeout(genFlushTimer);
              genFlushTimer = null;
            }
            setLivePreviewHtml(null);
            setBanner(message);
            void refresh(null);
          },
        });
      } catch (e) {
        setBanner(e instanceof Error ? e.message : "Generation failed");
        void refresh(null);
      } finally {
        if (genFlushTimer != null) {
          clearTimeout(genFlushTimer);
          genFlushTimer = null;
        }
        setAiBusy(false);
        setStreamingPhase(null);
        setStreamingText("");
        setLivePreviewHtml(null);
        releaseLock();
      }
    })();
  }, [projectId, businessId, refresh, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingText, streamingPhase]);

  const previewHtml = useMemo(() => {
    if (livePreviewHtml) return livePreviewHtml;
    return buildPreviewDocumentFromFiles(files);
  }, [files, livePreviewHtml]);

  const onSelectTab = (path: string) => {
    if (dirty && path !== activePath) {
      const ok = window.confirm("You have unsaved changes. Switch file anyway?");
      if (!ok) return;
    }
    setActivePath(path);
    setEditorContent(files.find((f) => f.path === path)?.content ?? "");
    setDirty(false);
  };

  const onEditorChange = (v: string) => {
    setEditorContent(v);
    setDirty(true);
  };

  const saveFile = async () => {
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/ai-studio/projects/${projectId}/files`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: activePath, content: editorContent }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Save failed");
      setFiles((prev) => {
        const ix = prev.findIndex((p) => p.path === activePath);
        const next = [...prev];
        if (ix >= 0) next[ix] = { ...next[ix]!, content: editorContent };
        else next.push({ path: activePath, language: "html", content: editorContent });
        return next;
      });
      setDirty(false);
      setBanner("Saved.");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const sendEdit = async () => {
    const text = instruction.trim();
    if (!text || aiBusy) return;

    const optimisticId = `optimistic-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, role: "user", content: text, created_at: new Date().toISOString() },
    ]);
    setInstruction("");
    setAiBusy(true);
    setStreamingPhase("Thinking...");
    setStreamingText("");
    setBanner(null);

    try {
      const res = await fetch(`/api/ai-studio/projects/${projectId}/edit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ instruction: text }),
      });

      await consumeWebsiteSse(res, {
        onPhase: (message) => setStreamingPhase(message),
        onDelta: (chunk) => setStreamingText((t) => t + chunk),
        onComplete: async (payload) => {
          const nextFiles: AiWebsiteFile[] = (payload.files ?? []).map((f) => ({
            path: f.path,
            language: f.language,
            content: f.content,
          }));
          if (nextFiles.length > 0) {
            setFiles(nextFiles);
            const cur = nextFiles.find((f) => f.path === activePath);
            if (cur) setEditorContent(cur.content);
          }
          if (payload.project_name) setProjectName(payload.project_name);
          if (payload.preview_slug != null) setPreviewSlug(payload.preview_slug);
          setDirty(false);
          await refresh(activePath);
        },
        onError: (message) => {
          setBanner(message);
          void refresh(activePath);
        },
      });
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "AI edit failed");
      void refresh(activePath);
    } finally {
      setAiBusy(false);
      setStreamingPhase(null);
      setStreamingText("");
    }
  };

  const copyPreviewLink = async () => {
    if (!previewSlug) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/preview/${previewSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      setBanner("Preview link copied.");
    } catch {
      setBanner("Could not copy link.");
    }
  };

  const paths = sortPaths(files.map((f) => f.path));

  if (loadError) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-700">{loadError}</p>
        <Button className="mt-4" variant="outline" onClick={() => void refresh(null)}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3">
        <div className="min-w-0 space-y-0.5">
          <h1 className="truncate text-lg font-semibold text-zinc-900">{projectName}</h1>
          <p className="truncate text-sm text-zinc-600">{businessName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loading && <span className="text-xs text-zinc-500">Updating…</span>}
          {dirty && <span className="text-xs font-medium text-amber-700">Unsaved changes</span>}
          {businessId && (
            <Link href={`/businesses/${businessId}`}>
              <Button variant="outline" size="sm">
                Back to business
              </Button>
            </Link>
          )}
          {previewSlug && (
            <>
              <a href={`/preview/${previewSlug}`} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="sm">
                  Open preview
                </Button>
              </a>
              <Button type="button" variant="outline" size="sm" onClick={() => void copyPreviewLink()}>
                Copy preview link
              </Button>
            </>
          )}
        </div>
      </header>

      {banner && (
        <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2 text-sm text-zinc-800" role="status">
          {banner}
        </div>
      )}

      <div className="grid flex-1 gap-0 lg:grid-cols-12 lg:divide-x lg:divide-zinc-200">
        <aside className="flex min-h-0 flex-col border-b border-zinc-200 p-4 lg:col-span-3 lg:border-b-0">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">AI chat</h2>
          <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden lg:max-h-none">
            <div className="max-h-48 flex-1 space-y-2 overflow-y-auto text-sm text-zinc-800 lg:max-h-[min(60vh,520px)]">
              {messages.length === 0 && !aiBusy && <p className="text-zinc-500">No messages yet.</p>}
              {messages.map((m) => (
                <div key={m.id} className={m.role === "user" ? "rounded bg-sky-50 p-2" : "rounded bg-zinc-100 p-2"}>
                  <p className="text-xs font-medium text-zinc-500">{m.role}</p>
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                </div>
              ))}
              {aiBusy && (streamingPhase || streamingText) && (
                <div className="rounded border border-dashed border-sky-200 bg-white p-2">
                  <p className="text-xs font-medium text-zinc-500">assistant</p>
                  {streamingPhase && <p className="text-xs font-medium text-sky-800">{streamingPhase}</p>}
                  {streamingText ? (
                    <p className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs text-zinc-700">
                      {streamingText}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-zinc-500">Waiting for output…</p>
                  )}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
          <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
            <p className="text-xs text-zinc-500">Quick prompts</p>
            <div className="flex flex-wrap gap-1">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-50"
                  onClick={() => setInstruction(q)}
                >
                  {q}
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Ask AI to change the website…"
              rows={3}
              className="resize-y text-sm"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
            <Button
              type="button"
              className="w-full bg-sky-600 hover:bg-sky-700"
              disabled={aiBusy || !instruction.trim()}
              onClick={() => void sendEdit()}
            >
              {aiBusy ? streamingPhase ?? "Working…" : "Send to AI"}
            </Button>
          </div>
        </aside>

        <section className="flex min-h-[360px] flex-col border-b border-zinc-200 p-4 lg:col-span-5 lg:border-b-0">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Live preview</h2>
          <div className="mt-2 min-h-0 flex-1">
            <PreviewFrame html={previewHtml} title="Studio preview" />
          </div>
        </section>

        <aside className="flex flex-col p-4 lg:col-span-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Files</h2>
          <div className="mt-2 flex flex-wrap gap-1">
            {paths.map((p) => {
              const active = p === activePath;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onSelectTab(p)}
                  className={`rounded-md border px-2 py-1 text-xs font-medium ${
                    active ? "border-sky-600 bg-sky-50 text-sky-900" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
          <Textarea
            className="mt-3 min-h-[280px] flex-1 font-mono text-sm"
            value={editorContent}
            onChange={(e) => onEditorChange(e.target.value)}
            spellCheck={false}
          />
          <div className="mt-2 flex items-center gap-2">
            <Button type="button" variant="outline" disabled={saving || !dirty} onClick={() => void saveFile()}>
              {saving ? "Saving…" : "Save file"}
            </Button>
            {dirty && <span className="text-xs text-amber-700">Unsaved</span>}
          </div>
        </aside>
      </div>
    </div>
  );
}

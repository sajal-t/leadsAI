"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Code2,
  Copy,
  ExternalLink,
  Loader2,
  MessageSquare,
  Monitor,
  PanelRightClose,
  PanelRightOpen,
  Save,
  Send,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import { StudioPreviewChrome } from "@/components/studio/studio-preview-chrome";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { buildPreviewDocumentFromFiles } from "@/lib/ai/build-preview-html";
import { extractStreamingHtmlDocument } from "@/lib/ai/extract-model-html";
import type { AiWebsiteFile } from "@/lib/ai/parse-website-files";
import type { StudioPayload } from "@/lib/studio-load";
import { consumeWebsiteSse } from "@/lib/website-stream-consumer";
import { cn } from "@/lib/utils";

type Message = { id: string; role: string; content: string; created_at: string };

const STUDIO_LIVE_PREVIEW_THROTTLE_MS = 900;

const QUICK_PROMPTS = [
  "Make it more modern",
  "Add a pricing section",
  "Make the hero more premium",
  "Change colors to blue and white",
  "Add a stronger CTA",
  "Make it feel more local",
];

type MobileTab = "chat" | "preview" | "code";

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

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-neutral-900 text-white"
            : "border border-neutral-200/80 bg-white text-neutral-800",
        )}
      >
        {!isUser && <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">AI</p>}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  );
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
  const [livePreviewHtml, setLivePreviewHtml] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [mobileTab, setMobileTab] = useState<MobileTab>("preview");
  const [codeOpen, setCodeOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pendingInitialGenRef = useRef(false);

  const closeSourcePanel = useCallback(() => {
    setCodeOpen(false);
    setMobileTab("preview");
  }, []);

  const openSourcePanel = useCallback(() => {
    setCodeOpen(true);
    setMobileTab("code");
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("leadforge-studio-code-open");
      if (stored === "1") setCodeOpen(true);
      if (stored === "0") setCodeOpen(false);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("leadforge-studio-code-open", codeOpen ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [codeOpen]);

  const refresh = useCallback(
    async (keepPath: string | null = null) => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/ai-studio/projects/${projectId}`);
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Failed to load studio");
        setProjectName(data.project?.name ?? "Project");
        setPreviewSlug(data.preview_slug ?? null);
        const nextFiles: AiWebsiteFile[] = (data.files ?? []).map(
          (f: { path: string; language: string; content: string }) => ({
            path: f.path,
            language: f.language,
            content: f.content,
          }),
        );
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
    },
    [projectId],
  );

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
      setMobileTab("preview");
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
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
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

  const previewDisplayUrl = previewSlug
    ? `${typeof window !== "undefined" ? window.location.host : "leadforge.app"}/preview/${previewSlug}`
    : null;

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
      setBanner("Changes saved");
      setTimeout(() => setBanner(null), 2500);
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
    setMobileTab("chat");

    try {
      const res = await fetch(`/api/ai-studio/projects/${projectId}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
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
          setMobileTab("preview");
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
      setBanner("Preview link copied");
      setTimeout(() => setBanner(null), 2500);
    } catch {
      setBanner("Could not copy link");
    }
  };

  const paths = sortPaths(files.map((f) => f.path));

  const generatingOverlay = aiBusy ? (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/85 backdrop-blur-[2px]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
        <Loader2 className="h-6 w-6 animate-spin text-white" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold tracking-normal text-neutral-900">
          {streamingPhase ?? "Working on your site…"}
        </p>
        <p className="mt-1 text-sm text-neutral-500">Changes appear in the preview as they generate</p>
      </div>
    </div>
  ) : null;

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6fb] p-8">
        <div className="max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-lg">
          <p className="text-sm text-red-600">{loadError}</p>
          <Button className="mt-4 rounded-full" variant="outline" onClick={() => void refresh(null)}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f4f6fb]">
      {/* Toolbar */}
      <header className="z-20 flex shrink-0 flex-wrap items-center gap-3 border-b border-neutral-200/80 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href={businessId ? `/businesses/${businessId}` : "/dashboard/websites"}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200/80 text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight text-neutral-900 sm:text-lg">{projectName}</h1>
            {businessName ? (
              <p className="truncate text-xs text-neutral-500 sm:text-sm">{businessName}</p>
            ) : null}
          </div>
          {dirty && (
            <span className="hidden shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200/80 sm:inline">
              Unsaved
            </span>
          )}
          {loading && <span className="hidden text-xs text-neutral-400 sm:inline">Syncing…</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center rounded-full border border-neutral-200/80 bg-neutral-50 p-0.5 sm:flex">
            <button
              type="button"
              onClick={() => setViewMode("desktop")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === "desktop" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800",
              )}
            >
              <Monitor className="h-3.5 w-3.5" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewMode("mobile")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === "mobile" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800",
              )}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Mobile
            </button>
          </div>

          <button
            type="button"
            onClick={() => (codeOpen ? closeSourcePanel() : openSourcePanel())}
            className={cn(
              "hidden h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors lg:inline-flex",
              codeOpen
                ? "border-neutral-200/80 bg-white text-neutral-700 hover:bg-neutral-50"
                : "border-indigo-200/80 bg-indigo-50 text-indigo-800 hover:bg-indigo-100",
            )}
            aria-pressed={codeOpen}
          >
            {codeOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
            {codeOpen ? "Hide source" : "Show source"}
          </button>

          {previewSlug && (
            <>
              <a href={`/preview/${previewSlug}`} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-full border-neutral-200/80 bg-white">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Open</span>
                </Button>
              </a>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="hidden h-9 gap-1.5 rounded-full border-neutral-200/80 bg-white sm:inline-flex"
                onClick={() => void copyPreviewLink()}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy link
              </Button>
            </>
          )}

          <Button
            type="button"
            size="sm"
            disabled={saving || !dirty}
            className="h-9 gap-1.5 rounded-full bg-neutral-900 text-white hover:bg-neutral-800"
            onClick={() => void saveFile()}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </header>

      {banner && (
        <div
          className="flex shrink-0 items-center gap-2 border-b border-indigo-100 bg-indigo-50/90 px-4 py-2 text-sm text-indigo-900"
          role="status"
        >
          <Check className="h-4 w-4 shrink-0" />
          {banner}
        </div>
      )}

      {/* Mobile tabs */}
      <div className="flex shrink-0 gap-1 border-b border-neutral-200/80 bg-white px-3 py-2 lg:hidden">
        {(
          [
            { id: "chat" as const, label: "AI", icon: MessageSquare },
            { id: "preview" as const, label: "Preview", icon: Monitor },
            { id: "code" as const, label: "Code", icon: Code2 },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setMobileTab(id);
              if (id === "code") setCodeOpen(true);
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors",
              mobileTab === id ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Workspace */}
      <div className="flex min-h-0 flex-1 flex-row gap-0 overflow-hidden p-3 sm:p-4 lg:gap-4">
        {/* Chat */}
        <aside
          className={cn(
            "flex min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm lg:w-[min(100%,380px)] lg:shrink-0 xl:w-[400px]",
            mobileTab !== "chat" && "hidden lg:flex",
          )}
        >
          <div className="border-b border-neutral-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-900">AI Assistant</p>
                <p className="text-xs text-neutral-500">Describe changes in plain English</p>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && !aiBusy && (
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/80 px-4 py-6 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-indigo-400" />
                <p className="mt-2 text-sm font-medium text-neutral-800">Start iterating</p>
                <p className="mt-1 text-xs text-neutral-500">
                  Ask for layout, copy, colors, or new sections — updates apply to your preview instantly.
                </p>
              </div>
            )}
            {messages.map((m) => (
              <ChatBubble key={m.id} message={m} />
            ))}
            {aiBusy && (
              <div className="flex gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="max-w-[92%] rounded-2xl border border-indigo-100 bg-indigo-50/50 px-3.5 py-2.5 text-sm leading-relaxed shadow-sm">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">AI</p>
                  <p className="font-medium text-neutral-900">{streamingPhase ?? "Thinking…"}</p>
                  <p className="mt-1 text-neutral-600">
                    {streamingText ? "Updating your preview — hang tight." : "This usually takes a moment."}
                  </p>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="shrink-0 border-t border-neutral-100 bg-neutral-50/50 p-4">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="shrink-0 rounded-full border border-neutral-200/80 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800"
                  onClick={() => setInstruction(q)}
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="relative rounded-2xl border border-neutral-200/80 bg-white shadow-sm focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/15">
              <Textarea
                placeholder="e.g. Add a testimonials section with three cards…"
                rows={3}
                className="min-h-[88px] resize-none border-0 bg-transparent px-4 py-3 pr-14 text-sm shadow-none focus-visible:ring-0"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void sendEdit();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                disabled={aiBusy || !instruction.trim()}
                className="absolute bottom-2.5 right-2.5 h-9 w-9 rounded-xl bg-neutral-900 p-0 text-white hover:bg-neutral-800 disabled:opacity-40"
                onClick={() => void sendEdit()}
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-center text-[10px] text-neutral-400">⌘ + Enter to send</p>
          </div>
        </aside>

        {/* Preview */}
        <section
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
            mobileTab !== "preview" && "hidden lg:flex",
          )}
        >
          <StudioPreviewChrome
            html={previewHtml}
            previewUrl={previewDisplayUrl}
            viewMode={viewMode}
            className="min-h-0 flex-1"
            overlay={generatingOverlay}
          />
        </section>

        {/* Code */}
        <aside
          className={cn(
            "flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-[#1e1e2e] shadow-sm lg:w-[min(100%,420px)]",
            !codeOpen
              ? "hidden"
              : mobileTab !== "code"
                ? "hidden lg:flex"
                : undefined,
          )}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-violet-300" />
              <span className="text-sm font-semibold text-white">Source</span>
            </div>
            <div className="flex items-center gap-2">
              {dirty && <span className="text-[10px] font-medium uppercase tracking-wide text-amber-400">Modified</span>}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  closeSourcePanel();
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close source panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div className="flex gap-1 overflow-x-auto border-b border-white/10 p-2 lg:w-36 lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r">
              {paths.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onSelectTab(p)}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors lg:w-full",
                    p === activePath
                      ? "bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/30"
                      : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col p-3">
              <Textarea
                className="min-h-[min(50vh,480px)] flex-1 resize-none rounded-xl border-white/10 bg-[#151520] font-mono text-[13px] leading-relaxed text-neutral-100 shadow-inner focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20 lg:min-h-0"
                value={editorContent}
                onChange={(e) => onEditorChange(e.target.value)}
                spellCheck={false}
              />
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-neutral-500">{activePath}</span>
                <Button
                  type="button"
                  size="sm"
                  disabled={saving || !dirty}
                  className="h-8 rounded-lg bg-violet-600 text-xs text-white hover:bg-violet-500"
                  onClick={() => void saveFile()}
                >
                  {saving ? "Saving…" : "Save file"}
                </Button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

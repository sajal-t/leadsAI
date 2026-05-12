import { z } from "zod";

export type AiWebsiteFile = {
  path: string;
  language: string;
  content: string;
};

export type AiWebsiteGeneration = {
  project_name: string;
  files: AiWebsiteFile[];
};

const fileSchema = z.object({
  path: z.string(),
  language: z.string(),
  content: z.string(),
});

const generationSchema = z.object({
  project_name: z.string(),
  files: z.array(fileSchema),
});

const ALLOWED_ROOT = new Set(["index.html", "style.css", "styles.css", "script.js", "main.js"]);

function isAllowedPath(path: string): boolean {
  if (!path || path.includes("..") || path.startsWith("/") || path.includes("\\")) {
    return false;
  }
  if (ALLOWED_ROOT.has(path)) return true;
  if (path.startsWith("assets/")) {
    const rest = path.slice("assets/".length);
    if (!rest || rest.includes("..")) return false;
    return /^[a-zA-Z0-9._/-]+$/.test(rest);
  }
  return false;
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(trimmed);
  if (fence?.[1]) return fence[1].trim();
  const loose = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (loose?.[1]) return loose[1].trim();
  return trimmed;
}

export function parseWebsiteFilesFromModelText(raw: string): AiWebsiteGeneration {
  const cleaned = stripCodeFences(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const extracted = extractJsonObject(cleaned);
    if (!extracted) {
      throw new Error("INVALID_WEBSITE_JSON");
    }
    try {
      parsed = JSON.parse(extracted);
    } catch {
      throw new Error("INVALID_WEBSITE_JSON");
    }
  }

  const result = generationSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("INVALID_WEBSITE_JSON");
  }

  if (!Array.isArray(result.data.files)) {
    throw new Error("INVALID_WEBSITE_JSON");
  }

  const hasIndex = result.data.files.some((f) => f.path === "index.html");
  if (!hasIndex) {
    throw new Error("MISSING_INDEX_HTML");
  }

  const seen = new Set<string>();
  const files: AiWebsiteFile[] = [];

  for (const f of result.data.files) {
    if (!isAllowedPath(f.path)) continue;
    if (seen.has(f.path)) continue;
    seen.add(f.path);
    files.push({
      path: f.path,
      language: f.language || inferLanguage(f.path),
      content: f.content,
    });
  }

  if (!files.some((f) => f.path === "index.html")) {
    throw new Error("MISSING_INDEX_HTML");
  }

  return {
    project_name: result.data.project_name || "Business Website Preview",
    files,
  };
}

function inferLanguage(path: string): string {
  if (path.endsWith(".html")) return "html";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".js")) return "javascript";
  return "text";
}

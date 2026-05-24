import type { AiWebsiteFile } from "@/lib/ai/parse-website-files";

const PREVIEW_RESET = `<style data-leadforge-preview-reset>html,body{margin:0;padding:0;width:100%;min-height:100%;}</style>`;

function injectPreviewReset(html: string): string {
  if (html.includes("data-leadforge-preview-reset")) return html;
  if (html.includes("</head>")) {
    return html.replace("</head>", `${PREVIEW_RESET}</head>`);
  }
  if (html.includes("<head>")) {
    return html.replace("<head>", `<head>${PREVIEW_RESET}`);
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${PREVIEW_RESET}</head><body>${html}</body></html>`;
}

/** True when index.html is the only file or the only file with content (DeepSite single-file mode). */
function isSelfContainedIndexOnly(files: AiWebsiteFile[]): boolean {
  const withContent = files.filter((f) => (f.content ?? "").trim().length > 0);
  if (withContent.length === 0) return false;
  if (withContent.length === 1 && withContent[0]!.path === "index.html") return true;
  return false;
}

/** Inline CSS/JS into index.html for legacy multi-file projects, or return self-contained index as-is. */
export function buildPreviewDocumentFromFiles(files: AiWebsiteFile[]): string {
  const byPath = Object.fromEntries(files.map((f) => [f.path, f.content]));
  const index = byPath["index.html"];
  if (!index) {
    return "<!DOCTYPE html><html><head><meta charset=\"utf-8\"/></head><body><p>Missing index.html</p></body></html>";
  }

  if (isSelfContainedIndexOnly(files)) {
    return injectPreviewReset(index);
  }

  const css = byPath["style.css"] ?? byPath["styles.css"] ?? "";
  const js = byPath["script.js"] ?? byPath["main.js"] ?? "";

  let html = index;

  if (css) {
    const block = `<style data-inlined="true">\n${escapeStyleBlock(css)}\n</style>`;
    if (html.includes("</head>")) {
      html = html.replace("</head>", `${block}</head>`);
    } else if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>${block}`);
    } else {
      html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>${block}</head><body>${html}</body></html>`;
    }
  }

  if (js) {
    const block = `\n<script>\n${escapeScriptBlock(js)}\n</script>\n`;
    if (html.includes("</body>")) {
      html = html.replace("</body>", `${block}</body>`);
    } else {
      html = `${html}${block}`;
    }
  }

  return injectPreviewReset(html);
}

function escapeStyleBlock(css: string): string {
  return css.replace(/<\/style/gi, "<\\/style");
}

function escapeScriptBlock(js: string): string {
  return js.replace(/<\/script/gi, "<\\/script");
}

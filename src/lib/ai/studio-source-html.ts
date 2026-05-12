import { buildPreviewDocumentFromFiles } from "@/lib/ai/build-preview-html";
import type { AiWebsiteFile } from "@/lib/ai/parse-website-files";

/** HTML string used as the edit source: self-contained index, or merged legacy multi-file preview. */
export function getStudioSourceHtml(files: AiWebsiteFile[]): string {
  if (!files.length) {
    return "<!DOCTYPE html><html><head><meta charset=\"utf-8\"/></head><body></body></html>";
  }
  const index = files.find((f) => f.path === "index.html");
  if (index?.content?.trim()) {
    return index.content;
  }
  return buildPreviewDocumentFromFiles(files);
}

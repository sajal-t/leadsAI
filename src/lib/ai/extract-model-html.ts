/** Strip optional markdown fences around model output. */
export function stripModelMarkdownFences(raw: string): string {
  const t = raw.trim();
  const fence = /^```(?:html)?\s*([\s\S]*?)```$/im.exec(t);
  if (fence?.[1]) return fence[1].trim();
  const loose = t.match(/```(?:html)?\s*([\s\S]*?)```/);
  if (loose?.[1]) return loose[1].trim();
  return t;
}

/** Best-effort HTML slice for live streaming preview (may be incomplete). */
export function extractStreamingHtmlDocument(raw: string): string {
  const t = stripModelMarkdownFences(raw);
  const start = t.search(/<!DOCTYPE\s+html|<!doctype\s+html|<html[\s>]/i);
  if (start === -1) {
    return t;
  }
  return t.slice(start);
}

/**
 * Prefer a complete document ending in </html> when present; otherwise same as streaming slice.
 */
export function extractFinalHtmlDocument(raw: string): string | null {
  const t = stripModelMarkdownFences(raw);
  const start = t.search(/<!DOCTYPE\s+html|<!doctype\s+html|<html[\s>]/i);
  if (start === -1) {
    return null;
  }
  let doc = t.slice(start).trim();
  const end = doc.lastIndexOf("</html>");
  if (end !== -1) {
    doc = doc.slice(0, end + 7);
  }
  return doc.length > 0 ? doc : null;
}

export function projectNameFromHtml(html: string, fallback: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const t = m?.[1]?.trim();
  if (t) return t.slice(0, 120);
  return fallback.slice(0, 120);
}

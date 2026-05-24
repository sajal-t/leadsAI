/**
 * Brave Web Search API (single provider).
 * Prefer `webSearch` from `./web-search` for discovery (Serper / Tavily / Brave).
 * @see https://api.search.brave.com/res/v1/web/search
 */
export type NormalizedWebSearchHit = {
  title: string;
  url: string;
  snippet: string;
  /** Provider id for metadata / logging */
  source: "brave";
};

const BRAVE_WEB_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";

/**
 * Returns web results (title, URL, snippet). Empty array if no API key or on HTTP error.
 */
export async function braveWebSearch(query: string, count = 10): Promise<NormalizedWebSearchHit[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!key) return [];

  const safeCount = Math.min(20, Math.max(1, Math.floor(count)));
  const url = new URL(BRAVE_WEB_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(safeCount));

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": key,
      },
      signal: AbortSignal.timeout(25_000),
    });
  } catch (e) {
    console.warn("[brave-web-search] request failed", e instanceof Error ? e.message : e);
    return [];
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.warn("[brave-web-search]", res.status, detail.slice(0, 300));
    return [];
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return [];
  }

  const root = json as {
    web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
  };
  const results = root.web?.results ?? [];

  return results
    .map((r) => ({
      title: (r.title ?? "").trim(),
      url: (r.url ?? "").trim(),
      snippet: (r.description ?? "").trim(),
      source: "brave" as const,
    }))
    .filter((r) => r.url.length > 0);
}

export function isBraveSearchConfigured(): boolean {
  return Boolean(process.env.BRAVE_SEARCH_API_KEY?.trim());
}

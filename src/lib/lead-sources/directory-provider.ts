import type { ClassifiedSerpHit, RawLead } from "./types";

/** Derive extra RawLead rows from SERP hits classified as directory/chamber without extra paid calls. */
export function rawLeadsFromDirectoryHits(hits: ClassifiedSerpHit[], niche: string): RawLead[] {
  const out: RawLead[] = [];
  for (const h of hits) {
    if (h.kind !== "yelp" && h.kind !== "directory" && h.kind !== "chamber") continue;
    const cleanName = h.title.split("|")[0]?.split("-")[0]?.trim() || h.title || "Unknown business";
    out.push({
      source: "directory_serp",
      sourceUrl: h.url,
      name: cleanName.slice(0, 200),
      category: niche,
      address: h.snippet.slice(0, 400),
      websiteUrl: h.url,
      rawData: { kind: h.kind, snippet: h.snippet, searchProvider: "brave" },
    });
  }
  return out;
}

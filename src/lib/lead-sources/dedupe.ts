import { createHash } from "crypto";
import type { RawLead } from "./types";
import { isRealBusinessWebsite } from "./website-detection";

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function dedupeKey(lead: RawLead): string {
  const base = `${norm(lead.name)}|${norm(lead.phone ?? "")}|${norm(lead.address ?? "")}`;
  return createHash("sha256").update(base).digest("hex").slice(0, 40);
}

function mergeLeads(a: RawLead, b: RawLead): RawLead {
  const social = [...new Set([...(a.socialUrls ?? []), ...(b.socialUrls ?? [])])];
  const urls = [a.websiteUrl, b.websiteUrl].filter(Boolean) as string[];
  const pickWebsite =
    urls.find((u) => isRealBusinessWebsite(u)) ?? a.websiteUrl ?? b.websiteUrl;
  return {
    ...a,
    source: a.source,
    googlePlaceId: a.googlePlaceId ?? b.googlePlaceId,
    googleMapsUrl: a.googleMapsUrl ?? b.googleMapsUrl,
    phone: a.phone ?? b.phone,
    email: a.email ?? b.email,
    address: a.address ?? b.address,
    city: a.city ?? b.city,
    state: a.state ?? b.state,
    websiteUrl: pickWebsite,
    socialUrls: social.length ? social : undefined,
    rating: a.rating ?? b.rating,
    reviewCount: a.reviewCount ?? b.reviewCount,
    rawData: { merged: [a.rawData, b.rawData] },
  };
}

export function dedupeRawLeads(leads: RawLead[]): RawLead[] {
  const map = new Map<string, RawLead>();
  for (const L of leads) {
    const k = dedupeKey(L);
    const ex = map.get(k);
    if (!ex) {
      map.set(k, { ...L });
    } else {
      map.set(k, mergeLeads(ex, L));
    }
  }
  return [...map.values()];
}

export function syntheticPlaceId(lead: RawLead): string {
  const h = dedupeKey(lead);
  return `ll:${h}`;
}

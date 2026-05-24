"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Heart, Phone, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PITCH_LIST_STATUSES, websiteStatusLabel } from "@/lib/lead-sources/website-detection";

export type LeadRow = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  website_status: string;
  google_maps_url: string | null;
  rating: number | null;
  review_count: number | null;
  niche: string;
  city: string;
};

export function LeadFinderClient({
  initialLeads,
  initialNoWebsite,
}: {
  initialLeads: LeadRow[];
  initialNoWebsite: boolean;
}) {
  const [query, setQuery] = useState("");
  const [noWebsite, setNoWebsite] = useState(initialNoWebsite);
  const [selected, setSelected] = useState<LeadRow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialLeads.filter((l) => {
      if (noWebsite && !PITCH_LIST_STATUSES.has(l.website_status)) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        l.niche.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q)
      );
    });
  }, [initialLeads, query, noWebsite]);

  const areaLabel = initialLeads[0] ? `${initialLeads[0].city}` : "your area";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter saved leads…"
            className="rounded-lg border-neutral-200 pl-10 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={noWebsite} onChange={(e) => setNoWebsite(e.target.checked)} className="accent-blue-500" />
          Without a proper website
        </label>
      </div>

      <p className="text-sm text-neutral-600">
        Found <span className="font-semibold text-neutral-900">{filtered.length}</span> businesses
        {noWebsite ? " without a proper website" : ""} {areaLabel ? `· ${areaLabel}` : ""}
      </p>

      <div className="flex flex-col gap-4">
        {filtered.map((lead) => (
          <button
            key={lead.id}
            type="button"
            onClick={() => setSelected(lead)}
            className="w-full rounded-lg border border-neutral-200 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-700">
                {lead.niche || "Business"}
              </span>
              <span className="inline-flex items-center gap-1 text-sm text-neutral-500">
                <Heart className="h-4 w-4" /> Save
              </span>
            </div>
            <p className="mt-3 text-lg font-semibold text-neutral-900">{lead.name}</p>
            <p className="mt-1 text-sm text-neutral-500">{lead.address}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-500">
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-neutral-700">
                {websiteStatusLabel(lead.website_status)}
              </span>
              {lead.rating != null && (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5">Rating {lead.rating}</span>
              )}
              {lead.review_count != null && (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5">{lead.review_count} reviews</span>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-neutral-600">
              {lead.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-4 w-4 text-blue-500" /> {lead.phone}
                </span>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="rounded-full border-neutral-200">
                <a href={`tel:${lead.phone ?? ""}`}>
                  <Phone className="mr-1 h-4 w-4" /> Call
                </a>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-full border-neutral-200">
                <Link href={`/businesses/${lead.id}`}>
                  <ArrowRight className="mr-1 h-4 w-4" /> Open lead
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-full border-neutral-200">
                <Link href={`/businesses/${lead.id}`}>
                  <Sparkles className="mr-1 h-4 w-4 text-blue-500" /> Create site
                </Link>
              </Button>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="presentation">
          <button type="button" className="h-full flex-1 cursor-default" aria-label="Close panel" onClick={() => setSelected(null)} />
          <aside className="h-full w-full max-w-[480px] overflow-y-auto border-l border-neutral-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">{selected.name}</h2>
                <p className="mt-1 text-sm text-neutral-500">{selected.address}</p>
              </div>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
            <div className="mt-6 space-y-4 text-sm">
              {selected.phone && <p className="text-neutral-700">Phone: {selected.phone}</p>}
              <p className="text-neutral-600">
                <span className="font-medium text-neutral-800">Website status: </span>
                {websiteStatusLabel(selected.website_status)}
              </p>
              {(selected.rating != null || selected.review_count != null) && (
                <p className="text-neutral-600">
                  {selected.rating != null && <span className="font-medium text-neutral-800">Rating: {selected.rating}</span>}
                  {selected.rating != null && selected.review_count != null && " · "}
                  {selected.review_count != null && (
                    <span className="font-medium text-neutral-800">{selected.review_count} reviews</span>
                  )}
                </p>
              )}
              {selected.website_url && (
                <a
                  href={selected.website_url}
                  className="block truncate text-blue-500 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {selected.website_url}
                </a>
              )}
              {selected.google_maps_url && (
                <a href={selected.google_maps_url} className="text-blue-500 hover:underline" target="_blank" rel="noreferrer">
                  Open in Google Maps
                </a>
              )}
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Button asChild className="rounded-full bg-neutral-900 text-white hover:bg-neutral-800">
                <Link href={`/businesses/${selected.id}`}>Generate cold call script</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-neutral-200">
                <Link href={`/businesses/${selected.id}`}>Generate website preview</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-neutral-500">
              Notes and full activity timeline live on the business workspace.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}

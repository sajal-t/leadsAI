import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Phone, Search, Users } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FindLeadsRunner } from "./find-leads-runner";
import { dbAdmin } from "@/lib/db";
import { getServerUserId } from "@/lib/server-user";
import { websiteStatusLabel } from "@/lib/lead-discovery/classify-website-status";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getServerUserId();
  if (!userId) redirect("/login");

  const { id } = await params;
  const db = dbAdmin();

  const [{ data: campaign }, { data: businesses }, { data: latestJob }] = await Promise.all([
    db.from("campaigns").select("*").eq("id", id).eq("user_id", userId).single(),
    db
      .from("businesses")
      .select("*, call_logs(outcome, created_at)")
      .eq("campaign_id", id)
      .eq("user_id", userId),
    db
      .from("lead_discovery_jobs")
      .select("*")
      .eq("campaign_id", id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!campaign) notFound();

  const savedLeads = businesses ?? [];
  const sampleSize =
    campaign != null && "max_sample_size" in campaign && typeof campaign.max_sample_size === "number"
      ? campaign.max_sample_size
      : 500;
  const lastDiscovery =
    "last_discovery_at" in campaign && campaign.last_discovery_at
      ? new Date(campaign.last_discovery_at as string).toLocaleString()
      : "last_places_search_at" in campaign && campaign.last_places_search_at
        ? new Date(campaign.last_places_search_at as string).toLocaleString()
        : null;

  const jobMeta = (latestJob?.meta ?? {}) as Record<string, unknown>;
  const jobStatus = latestJob?.status ? String(latestJob.status) : "—";

  return (
    <AppShell>
      <FindLeadsRunner campaignId={id} />
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-6 border-b border-neutral-200 pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <Link
              href="/dashboard/leads"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-500 hover:text-blue-600"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to lead finder
            </Link>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Campaign</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
                {String(campaign.niche)} <span className="text-neutral-400">·</span> {String(campaign.city)}
              </h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500">
                <span>Created {campaign.created_at ? new Date(campaign.created_at as string).toLocaleString() : "—"}</span>
                {lastDiscovery && <span>Last search {lastDiscovery}</span>}
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0 rounded-full bg-neutral-900 text-white hover:bg-neutral-800">
            <Link href={`/campaigns/${id}?finding=1`}>
              <Search className="mr-2 h-4 w-4" aria-hidden />
              Run lead search
            </Link>
          </Button>
        </div>

        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Last lead search</p>
          <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-neutral-500">Status</dt>
              <dd className="font-medium capitalize text-neutral-900">{jobStatus.replace(/_/g, " ")}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Reviewed</dt>
              <dd className="font-medium text-neutral-900">{String(jobMeta.total_scraped ?? latestJob?.leads_found ?? "—")}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Saved</dt>
              <dd className="font-medium text-neutral-900">{String(jobMeta.total_saved ?? latestJob?.leads_no_website ?? "—")}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Skipped</dt>
              <dd className="font-medium text-neutral-900">{String(jobMeta.total_skipped ?? "—")}</dd>
            </div>
          </dl>
        </section>

        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
          <div className="min-w-[160px] flex-1 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-neutral-500">
              <Users className="h-4 w-4 text-blue-500" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wide">Saved leads</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-neutral-900">{savedLeads.length}</p>
          </div>
          <div className="min-w-[160px] flex-1 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-neutral-500">
              <Search className="h-4 w-4 text-blue-500" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wide">Target saves</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-neutral-900">{sampleSize}</p>
          </div>
        </div>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Qualified leads</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Businesses without a real website on their listing. Use rating and reviews to prioritize outreach.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
            <div className="md:hidden">
              {savedLeads.length === 0 ? (
                <p className="p-6 text-center text-sm text-neutral-500">
                  No businesses without a proper website yet. Tap <strong>Find more leads</strong> above.
                </p>
              ) : (
                <ul className="divide-y divide-neutral-200">
                  {savedLeads.map((business) => (
                    <LeadMobileCard key={business.id as string} business={business} />
                  ))}
                </ul>
              )}
            </div>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-200 bg-neutral-50 hover:bg-neutral-50">
                    <TableHead className="px-4 text-xs font-medium uppercase tracking-wide text-neutral-500">Business</TableHead>
                    <TableHead className="px-4 text-xs font-medium uppercase tracking-wide text-neutral-500">Address</TableHead>
                    <TableHead className="px-4 text-xs font-medium uppercase tracking-wide text-neutral-500">Phone</TableHead>
                    <TableHead className="px-4 text-xs font-medium uppercase tracking-wide text-neutral-500">Rating</TableHead>
                    <TableHead className="px-4 text-xs font-medium uppercase tracking-wide text-neutral-500">Reviews</TableHead>
                    <TableHead className="px-4 text-xs font-medium uppercase tracking-wide text-neutral-500">Website status</TableHead>
                    <TableHead className="px-4 text-xs font-medium uppercase tracking-wide text-neutral-500">Last call</TableHead>
                    <TableHead className="px-4 text-right text-xs font-medium uppercase tracking-wide text-neutral-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedLeads.map((business) => {
                    const logs = [...(business.call_logs ?? [])].sort(
                      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                    );
                    const latestCall = logs[0]?.outcome ?? "—";
                    const st = String(business.website_status ?? "");
                    return (
                      <TableRow key={business.id as string} className="border-neutral-200 hover:bg-neutral-50">
                        <TableCell className="px-4 font-medium text-neutral-900">{business.name as string}</TableCell>
                        <TableCell className="max-w-[220px] truncate px-4 text-neutral-600">{business.address as string}</TableCell>
                        <TableCell className="px-4 text-neutral-600">{(business.phone as string | null) || "—"}</TableCell>
                        <TableCell className="px-4 text-neutral-600">{(business.rating as number | null) ?? "—"}</TableCell>
                        <TableCell className="px-4 text-neutral-600">{(business.review_count as number | null) ?? "—"}</TableCell>
                        <TableCell className="px-4">
                          <Badge variant={statusBadgeVariant()} className="rounded-full">
                            {websiteStatusLabel(st)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 text-sm capitalize text-neutral-600">
                          {String(latestCall).replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="px-4 text-right">
                          <div className="flex flex-col items-end gap-2">
                            <Button asChild size="sm" variant="outline" className="rounded-full border-neutral-200">
                              <Link href={`/businesses/${business.id as string}`}>Open workspace</Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {savedLeads.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="px-4 py-10 text-center text-sm text-neutral-500">
                        No businesses without a proper website yet. Use <strong>Find more leads</strong> above.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>

      </div>
    </AppShell>
  );
}

function statusBadgeVariant(): "warning" {
  return "warning";
}

function LeadMobileCard({
  business,
}: {
  business: {
    id: unknown;
    name: unknown;
    address: unknown;
    phone: unknown;
    website_status?: unknown;
    rating?: unknown;
    review_count?: unknown;
    call_logs?: { outcome: string; created_at: string }[];
  };
}) {
  const logs = [...(business.call_logs ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const latestCall = logs[0]?.outcome ?? "—";
  const st = String(business.website_status ?? "");
  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-neutral-900">{String(business.name)}</p>
          <p className="mt-1 text-sm text-neutral-500">{String(business.address)}</p>
          {(business.phone != null && String(business.phone).trim() !== "") && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-neutral-600">
              <Phone className="h-4 w-4 shrink-0 text-blue-500" aria-hidden />
              {String(business.phone)}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={statusBadgeVariant()} className="rounded-full">
              {websiteStatusLabel(st)}
            </Badge>
            {business.rating != null && (
              <span className="text-xs text-neutral-500">Rating {String(business.rating)}</span>
            )}
            {business.review_count != null && (
              <span className="text-xs text-neutral-500">{String(business.review_count)} reviews</span>
            )}
            <span className="text-xs capitalize text-neutral-500">{String(latestCall).replace(/_/g, " ")}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button asChild size="sm" variant="outline" className="w-full rounded-full border-neutral-200 sm:w-auto">
          <Link href={`/businesses/${String(business.id)}`}>Open workspace</Link>
        </Button>
      </div>
    </li>
  );
}

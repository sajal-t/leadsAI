import Link from "next/link";
import { ArrowLeft, ExternalLink, MapPin, Phone, Star } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BusinessSiteActions } from "@/components/business/business-site-actions";
import { ColdCallScriptCards } from "@/components/business/cold-call-script-cards";
import { GuidedCallLogger } from "@/components/business/guided-call-logger";
import { ScriptWorkspaceActions } from "@/components/business/script-workspace-actions";
import { dbAdmin } from "@/lib/db";
import { getServerUserId } from "@/lib/server-user";
import { websiteStatusLabel } from "@/lib/lead-discovery/classify-website-status";
import { notFound, redirect } from "next/navigation";

export default async function BusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getServerUserId();
  if (!userId) redirect("/login");

  const { id } = await params;
  const db = dbAdmin();

  const [{ data: business }, { data: calls }, { data: scriptRows }, { data: sites }, { data: studioProjectRow }] =
    await Promise.all([
      db.from("businesses").select("*, campaigns(id,niche,city)").eq("id", id).eq("user_id", userId).single(),
      db.from("call_logs").select("*").eq("business_id", id).eq("user_id", userId).order("created_at", { ascending: false }),
      db
        .from("generated_scripts")
        .select("*")
        .eq("business_id", id)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1),
      db.from("generated_sites").select("*").eq("business_id", id).eq("user_id", userId).order("created_at", { ascending: false }).limit(1),
      db.from("ai_site_projects").select("id").eq("business_id", id).eq("user_id", userId).maybeSingle(),
    ]);

  if (!business) notFound();

  const camp = business.campaigns as { id: string; niche: string; city: string } | { id: string; niche: string; city: string }[] | null;
  const campaign = Array.isArray(camp) ? camp[0] ?? null : camp;

  const script = scriptRows?.[0] ?? null;
  const site = sites?.[0] as { preview_slug?: string; ai_site_project_id?: string | null } | undefined;
  const studioProjectId = site?.ai_site_project_id ?? studioProjectRow?.id ?? null;

  let nextBusinessId: string | null = null;
  if (business?.campaign_id) {
    const { data: siblings } = await db
      .from("businesses")
      .select("id")
      .eq("campaign_id", business.campaign_id)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    const arr = siblings ?? [];
    const ix = arr.findIndex((r) => r.id === id);
    if (ix >= 0 && ix < arr.length - 1) nextBusinessId = arr[ix + 1]!.id;
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {campaign ? (
                <Link
                  href={`/campaigns/${campaign.id}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-500 hover:text-blue-600"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                  Back to campaign
                </Link>
              ) : (
                <Link
                  href="/dashboard/leads"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-500 hover:text-blue-600"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                  Back to lead finder
                </Link>
              )}
              <span className="hidden text-neutral-300 sm:inline">|</span>
              <Link href="/dashboard/leads" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
                All leads
              </Link>
              <span className="hidden text-neutral-300 sm:inline">|</span>
              <Link href="/dashboard" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
                Dashboard
              </Link>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Workspace</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">{business.name as string}</h1>
              {campaign && (
                <p className="mt-1 text-sm text-neutral-500">
                  Campaign: <span className="font-medium text-neutral-700">{campaign.niche}</span> · {campaign.city}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="rounded-full border-neutral-200">
              <Link href="/dashboard/leads">Exit workspace</Link>
            </Button>
            {business.phone && (
              <Button asChild className="rounded-full bg-neutral-900 text-white hover:bg-neutral-800">
                <a href={`tel:${business.phone}`}>
                  <Phone className="mr-2 h-4 w-4" aria-hidden />
                  Call
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
            <div className="min-w-0 flex-1 space-y-3 text-sm">
              <div className="flex flex-wrap items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" aria-hidden />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Address</p>
                  <p className="mt-0.5 text-neutral-900">{(business.address as string) || "—"}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" aria-hidden />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Phone</p>
                  <p className="mt-0.5 text-neutral-900">{(business.phone as string | null) || "—"}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <Star className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" aria-hidden />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Rating</p>
                  <p className="mt-0.5 text-neutral-900">
                    {(business.rating as number | null) ?? "—"} · {(business.review_count as number | null) ?? "—"} reviews
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Website</span>
                <Badge variant="warning" className="rounded-full">
                  {websiteStatusLabel(String(business.website_status))}
                </Badge>
              </div>
              {"lead_reason" in business && business.lead_reason ? (
                <p className="text-sm text-neutral-600">
                  <span className="font-medium text-neutral-800">Lead insight: </span>
                  {String(business.lead_reason)}
                </p>
              ) : null}
              {business.google_maps_url && (
                <a
                  href={business.google_maps_url as string}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-500 hover:text-blue-600"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google Maps
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Website preview</p>
          <div className="mt-4">
            <BusinessSiteActions businessId={id} previewSlug={site?.preview_slug ?? null} studioProjectId={studioProjectId} />
          </div>
        </div>

        <section className="space-y-6">
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
              <h2 className="text-lg font-semibold tracking-tight text-neutral-900">AI call script</h2>
              <p className="mt-1 text-sm text-neutral-500">
                One default path to read in order, plus alternates and objections. Generate fresh copy anytime.
              </p>
            </div>
            <div className="space-y-6 p-6">
              <ScriptWorkspaceActions businessId={id} activeScriptId={script?.id ?? null} />
              {script ? (
                <ColdCallScriptCards scriptJson={script.script_json} />
              ) : (
                <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-10 text-center">
                  <p className="text-sm text-neutral-600">No script yet. Use Generate script above.</p>
                </div>
              )}
            </div>
          </div>

          <GuidedCallLogger businessId={id} nextBusinessId={nextBusinessId} />
        </section>

        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Call history</h2>
          </div>
          <div className="space-y-3 p-6">
            {(calls ?? []).length === 0 && <p className="text-sm text-neutral-500">No calls logged yet.</p>}
            {(calls ?? []).map((call) => (
              <div key={call.id as string} className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium capitalize text-neutral-900">{String(call.outcome).replace(/_/g, " ")}</span>
                  {call.answered != null && (
                    <Badge variant="secondary" className="rounded-full">
                      {call.answered ? "Answered" : "No live answer"}
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-neutral-600">{(call.notes as string | null) || "—"}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  );
}

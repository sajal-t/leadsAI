import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BusinessSiteActions } from "@/components/business/business-site-actions";
import { ColdCallScriptCards } from "@/components/business/cold-call-script-cards";
import { GuidedCallLogger } from "@/components/business/guided-call-logger";
import { ScriptWorkspaceActions } from "@/components/business/script-workspace-actions";
import { dbAdmin } from "@/lib/db";
import { DEV_USER } from "@/lib/dev-user";

export default async function BusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = dbAdmin();

  const [{ data: business }, { data: calls }, { data: scriptRows }, { data: emails }, { data: sites }, { data: studioProjectRow }] =
    await Promise.all([
      db.from("businesses").select("*").eq("id", id).eq("user_id", DEV_USER.id).single(),
      db.from("call_logs").select("*").eq("business_id", id).eq("user_id", DEV_USER.id).order("created_at", { ascending: false }),
      db
        .from("generated_scripts")
        .select("*")
        .eq("business_id", id)
        .eq("user_id", DEV_USER.id)
        .order("created_at", { ascending: false })
        .limit(1),
      db.from("generated_emails").select("*").eq("business_id", id).eq("user_id", DEV_USER.id).order("created_at", { ascending: false }).limit(1),
      db.from("generated_sites").select("*").eq("business_id", id).eq("user_id", DEV_USER.id).order("created_at", { ascending: false }).limit(1),
      db.from("ai_site_projects").select("id").eq("business_id", id).eq("user_id", DEV_USER.id).maybeSingle(),
    ]);

  const script = scriptRows?.[0] ?? null;
  const email = emails?.[0];
  const site = sites?.[0] as { preview_slug?: string; ai_site_project_id?: string | null } | undefined;
  const studioProjectId = site?.ai_site_project_id ?? studioProjectRow?.id ?? null;

  let nextBusinessId: string | null = null;
  if (business?.campaign_id) {
    const { data: siblings } = await db
      .from("businesses")
      .select("id")
      .eq("campaign_id", business.campaign_id)
      .eq("user_id", DEV_USER.id)
      .order("created_at", { ascending: true });
    const arr = siblings ?? [];
    const ix = arr.findIndex((r) => r.id === id);
    if (ix >= 0 && ix < arr.length - 1) nextBusinessId = arr[ix + 1]!.id;
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{business?.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-zinc-800 md:flex-row md:flex-wrap md:items-center md:justify-between">
          <div className="space-y-1">
            <p>
              <span className="font-medium text-zinc-600">Phone:</span> {business?.phone || "—"}
            </p>
            <p>
              <span className="font-medium text-zinc-600">Address:</span> {business?.address || "—"}
            </p>
            <p>
              <span className="font-medium text-zinc-600">Rating:</span> {business?.rating ?? "—"} ·{" "}
              <span className="font-medium text-zinc-600">Reviews:</span> {business?.review_count ?? "—"}
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-zinc-600">Website status:</span>
              <Badge variant="warning">No website found</Badge>
            </p>
            {business?.google_maps_url && (
              <a href={business.google_maps_url} className="text-sky-700 underline" target="_blank" rel="noreferrer">
                Open Google Maps listing
              </a>
            )}
          </div>
          {business?.phone && (
            <a href={`tel:${business.phone}`}>
              <Button className="bg-sky-600 hover:bg-sky-700">Call business</Button>
            </a>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <BusinessSiteActions businessId={id} previewSlug={site?.preview_slug ?? null} studioProjectId={studioProjectId} />
        <div className="flex flex-wrap gap-2">
          <form action={`/api/businesses/${id}/generate-email`} method="post">
            <Button variant="outline">Generate follow-up email</Button>
          </form>
          {email && (
            <form action={`/api/emails/${email.id}/send`} method="post">
              <Button>Send email</Button>
            </form>
          )}
        </div>
      </div>

      <section className="space-y-6">
        <Card className="overflow-hidden border-zinc-200 shadow-sm">
          <CardHeader className="border-b border-zinc-100 bg-zinc-50/80 pb-4">
            <CardTitle className="text-lg">AI call script</CardTitle>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
              One default path to read in order, plus alternates and objections below. Generate fresh copy anytime.
            </p>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <ScriptWorkspaceActions businessId={id} activeScriptId={script?.id ?? null} />
            {script ? (
              <ColdCallScriptCards scriptJson={script.script_json} />
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-8 text-center">
                <p className="text-sm text-zinc-600">No script yet. Tap Generate script to create one.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <GuidedCallLogger businessId={id} nextBusinessId={nextBusinessId} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Call history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(calls ?? []).length === 0 && <p className="text-sm text-zinc-500">No calls logged yet.</p>}
          {(calls ?? []).map((call) => (
            <div key={call.id} className="rounded border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{call.outcome}</span>
                {call.answered != null && (
                  <Badge variant="default">{call.answered ? "Answered" : "No live answer"}</Badge>
                )}
              </div>
              <p className="text-zinc-600">{call.notes || "—"}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {email && (
        <Card>
          <CardHeader>
            <CardTitle>Generated email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{email.subject}</p>
            <p className="whitespace-pre-wrap">{email.body}</p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

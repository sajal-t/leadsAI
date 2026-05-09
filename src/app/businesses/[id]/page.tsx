import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { dbAdmin } from "@/lib/db";
import { DEV_USER } from "@/lib/dev-user";

export default async function BusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = dbAdmin();
  const [{ data: business }, { data: calls }, { data: scripts }, { data: emails }, { data: sites }] =
    await Promise.all([
      db.from("businesses").select("*").eq("id", id).eq("user_id", DEV_USER.id).single(),
      db.from("call_logs").select("*").eq("business_id", id).eq("user_id", DEV_USER.id).order("created_at", { ascending: false }),
      db.from("generated_scripts").select("*").eq("business_id", id).eq("user_id", DEV_USER.id).order("created_at", { ascending: false }).limit(1),
      db.from("generated_emails").select("*").eq("business_id", id).eq("user_id", DEV_USER.id).order("created_at", { ascending: false }).limit(1),
      db.from("generated_sites").select("*").eq("business_id", id).eq("user_id", DEV_USER.id).order("created_at", { ascending: false }).limit(1),
    ]);
  const script = scripts?.[0];
  const email = emails?.[0];
  const site = sites?.[0];

  return (
    <main className="mx-auto w-full max-w-6xl p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{business?.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-zinc-700 md:grid-cols-2">
          <p>Phone: {business?.phone || "-"}</p>
          <p>Address: {business?.address || "-"}</p>
          <p>Rating: {business?.rating || "-"}</p>
          <p>Review count: {business?.review_count || "-"}</p>
          <p>
            Google Maps:{" "}
            {business?.google_maps_url ? (
              <a href={business.google_maps_url} className="text-sky-700" target="_blank">
                Open
              </a>
            ) : (
              "-"
            )}
          </p>
          <p>
            Website status: <Badge variant="warning">No website found</Badge>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {business?.phone && (
            <a href={`tel:${business.phone}`}>
              <Button>Call business</Button>
            </a>
          )}
          <form action={`/api/businesses/${id}/generate-script`} method="post">
            <Button variant="outline">Generate cold-call script</Button>
          </form>
          <form action={`/api/businesses/${id}/generate-email`} method="post">
            <Button variant="outline">Generate follow-up email</Button>
          </form>
          <form action={`/api/businesses/${id}/generate-site`} method="post">
            <Button variant="outline">Generate website preview</Button>
          </form>
          {site?.preview_slug && (
            <a href={`/preview/${site.preview_slug}`} target="_blank">
              <Button variant="secondary">Open website preview</Button>
            </a>
          )}
          {email && (
            <form action={`/api/emails/${email.id}/send`} method="post">
              <Button>Send email</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log outcome</CardTitle>
        </CardHeader>
        <CardContent>
          <form action="/api/call-logs" method="post" className="space-y-2">
            <input type="hidden" name="business_id" value={id} />
            <select name="outcome" className="h-10 w-full rounded border border-zinc-300 px-3">
              {["no_answer", "voicemail", "interested", "not_interested", "callback", "meeting_booked", "wrong_number", "closed_won", "closed_lost"].map((outcome) => (
                <option value={outcome} key={outcome}>
                  {outcome}
                </option>
              ))}
            </select>
            <Textarea name="notes" placeholder="Call notes" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="follow_up_needed" value="true" />
              Follow up needed
            </label>
            <Button type="submit">Save call log</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Call history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(calls ?? []).map((call) => (
            <div key={call.id} className="rounded border p-3 text-sm">
              <p className="font-medium">{call.outcome}</p>
              <p className="text-zinc-600">{call.notes || "-"}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {script && (
        <Card>
          <CardHeader>
            <CardTitle>Generated script</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(script.script_json, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
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

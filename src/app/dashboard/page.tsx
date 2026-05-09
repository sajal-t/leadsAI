import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dbAdmin } from "@/lib/db";
import { DEV_USER } from "@/lib/dev-user";

const stats = [
  { key: "totalLeads", label: "Total leads" },
  { key: "callsMade", label: "Calls made" },
  { key: "noAnswers", label: "No answer count" },
  { key: "interestedLeads", label: "Interested leads" },
  { key: "meetingsBooked", label: "Meetings booked" },
  { key: "websitesGenerated", label: "Websites generated" },
  { key: "emailsSent", label: "Emails sent" },
  { key: "closedClients", label: "Closed clients" },
  { key: "mrr", label: "MRR" },
  { key: "arr", label: "ARR" },
] as const;

export default async function DashboardPage() {
  const db = dbAdmin();
  const [campaignsRes, businesses, calls, sites, emails, deals] = await Promise.all([
    db
      .from("campaigns")
      .select("*")
      .eq("user_id", DEV_USER.id)
      .order("created_at", { ascending: false })
      .limit(5),
    db.from("businesses").select("id").eq("user_id", DEV_USER.id),
    db.from("call_logs").select("outcome").eq("user_id", DEV_USER.id),
    db.from("generated_sites").select("id").eq("user_id", DEV_USER.id),
    db.from("generated_emails").select("status").eq("user_id", DEV_USER.id),
    db.from("deals").select("stage,monthly_fee").eq("user_id", DEV_USER.id),
  ]);

  const callsData = calls.data ?? [];
  const dealsData = deals.data ?? [];
  const mrr = dealsData
    .filter((deal) => deal.stage === "closed_won")
    .reduce((sum, deal) => sum + Number(deal.monthly_fee ?? 0), 0);
  const dashboard = {
    totalLeads: businesses.data?.length ?? 0,
    callsMade: callsData.length,
    noAnswers: callsData.filter((call) => call.outcome === "no_answer").length,
    interestedLeads: callsData.filter((call) => call.outcome === "interested").length,
    meetingsBooked: callsData.filter((call) => call.outcome === "meeting_booked").length,
    websitesGenerated: sites.data?.length ?? 0,
    emailsSent: (emails.data ?? []).filter((email) => email.status === "sent").length,
    closedClients: dealsData.filter((deal) => deal.stage === "closed_won").length,
    mrr,
    arr: mrr * 12,
  };
  const campaigns = campaignsRes.data ?? [];

  return (
    <main className="mx-auto w-full max-w-7xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link className="text-sm font-medium text-sky-700" href="/campaigns/new">
          + New campaign
        </Link>
      </div>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.key}>
            <CardHeader>
              <CardTitle className="text-sm text-zinc-600">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{dashboard[stat.key] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Recent campaigns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {campaigns.map((campaign) => (
            <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className="block rounded border p-3 hover:bg-zinc-50">
              {campaign.niche} in {campaign.city}
            </Link>
          ))}
          {campaigns.length === 0 && <p className="text-sm text-zinc-500">No campaigns yet.</p>}
        </CardContent>
      </Card>
    </main>
  );
}

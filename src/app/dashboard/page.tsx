import Link from "next/link";
import { RecentCampaignsCard } from "@/components/dashboard/recent-campaigns-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dbAdmin } from "@/lib/db";
import { safeRate } from "@/lib/dashboard-metrics";
import { DEV_USER } from "@/lib/dev-user";

const statCards = [
  { key: "totalLeads" as const, label: "Total leads" },
  { key: "callsMade" as const, label: "Calls made" },
  { key: "answeredCalls" as const, label: "Answered calls" },
  { key: "noAnswers" as const, label: "No answer" },
  { key: "voicemails" as const, label: "Voicemails" },
  { key: "interested" as const, label: "Interested" },
  { key: "infoRequested" as const, label: "Info requested" },
  { key: "callbacks" as const, label: "Callbacks" },
  { key: "meetingsBooked" as const, label: "Meetings booked" },
  { key: "notInterested" as const, label: "Not interested" },
  { key: "wrongNumbers" as const, label: "Wrong numbers" },
  { key: "alreadyHasSomeone" as const, label: "Already has someone" },
  { key: "tooExpensive" as const, label: "Too expensive" },
  { key: "doesNotNeedWebsite" as const, label: "Does not need website" },
  { key: "otherOutcomes" as const, label: "Other outcomes" },
  { key: "websitePreviewsGenerated" as const, label: "Website previews generated" },
  { key: "followUpEmailsGenerated" as const, label: "Follow-up emails generated" },
  { key: "emailsSent" as const, label: "Emails sent" },
  { key: "closedClients" as const, label: "Closed clients" },
  { key: "mrr" as const, label: "MRR" },
  { key: "arr" as const, label: "ARR" },
];

function formatStatValue(key: (typeof statCards)[number]["key"], value: number): string {
  if (key === "mrr" || key === "arr") {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
  return value.toLocaleString();
}

const defaultDash = {
  totalLeads: 0,
  callsMade: 0,
  answeredCalls: 0,
  noAnswers: 0,
  voicemails: 0,
  interested: 0,
  infoRequested: 0,
  callbacks: 0,
  meetingsBooked: 0,
  notInterested: 0,
  wrongNumbers: 0,
  alreadyHasSomeone: 0,
  tooExpensive: 0,
  doesNotNeedWebsite: 0,
  otherOutcomes: 0,
  websitePreviewsGenerated: 0,
  followUpEmailsGenerated: 0,
  emailsSent: 0,
  closedClients: 0,
  mrr: 0,
  arr: 0,
  answerRate: 0,
  interestRate: 0,
  meetingRate: 0,
  closeRate: 0,
};

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
    db.from("call_logs").select("outcome,answered").eq("user_id", DEV_USER.id),
    db.from("generated_sites").select("id").eq("user_id", DEV_USER.id),
    db.from("generated_emails").select("id,status").eq("user_id", DEV_USER.id),
    db.from("deals").select("stage,monthly_fee").eq("user_id", DEV_USER.id),
  ]);

  const callsData = calls.data ?? [];
  const dealsData = deals.data ?? [];
  const emailsData = emails.data ?? [];

  const mrr = dealsData
    .filter((deal) => deal.stage === "closed_won")
    .reduce((sum, deal) => sum + Number(deal.monthly_fee ?? 0), 0);

  const totalCalls = callsData.length;
  const answeredCalls = callsData.filter(
    (c) =>
      c.answered === true ||
      (c.answered == null && c.outcome !== "no_answer" && c.outcome !== "voicemail"),
  ).length;
  const interestedCalls = callsData.filter((c) => c.outcome === "interested").length;
  const closedWonDeals = dealsData.filter((d) => d.stage === "closed_won").length;

  const dashboard = {
    ...defaultDash,
    totalLeads: businesses.data?.length ?? 0,
    callsMade: totalCalls,
    answeredCalls,
    noAnswers: callsData.filter((c) => c.outcome === "no_answer").length,
    voicemails: callsData.filter((c) => c.outcome === "voicemail").length,
    interested: interestedCalls,
    infoRequested: callsData.filter((c) => c.outcome === "send_info").length,
    callbacks: callsData.filter((c) => c.outcome === "callback").length,
    meetingsBooked: callsData.filter((c) => c.outcome === "meeting_booked").length,
    notInterested: callsData.filter((c) => c.outcome === "not_interested").length,
    wrongNumbers: callsData.filter((c) => c.outcome === "wrong_number").length,
    alreadyHasSomeone: callsData.filter((c) => c.outcome === "already_has_someone").length,
    tooExpensive: callsData.filter((c) => c.outcome === "too_expensive").length,
    doesNotNeedWebsite: callsData.filter((c) => c.outcome === "does_not_need_website").length,
    otherOutcomes: callsData.filter((c) => c.outcome === "other").length,
    websitePreviewsGenerated: sites.data?.length ?? 0,
    followUpEmailsGenerated: emailsData.length,
    emailsSent: emailsData.filter((e) => e.status === "sent").length,
    closedClients: closedWonDeals,
    mrr,
    arr: mrr * 12,
    answerRate: safeRate(answeredCalls, totalCalls),
    interestRate: safeRate(interestedCalls, answeredCalls),
    meetingRate: safeRate(
      callsData.filter((c) => c.outcome === "meeting_booked").length,
      answeredCalls,
    ),
    closeRate: safeRate(closedWonDeals, interestedCalls),
  };

  const campaigns = (campaignsRes.data ?? []).map((c) => ({
    id: c.id as string,
    niche: c.niche as string,
    city: c.city as string,
  }));

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link className="text-sm font-medium text-sky-700" href="/campaigns/new">
          + New campaign
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.key}>
            <CardHeader>
              <CardTitle className="text-sm text-zinc-600">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatStatValue(stat.key, dashboard[stat.key] as number)}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Conversion rates</CardTitle>
          <p className="text-sm text-zinc-600">Percentages avoid divide-by-zero. Close rate uses closed deals over interested calls.</p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">Answer rate</p>
            <p className="text-2xl font-semibold">{dashboard.answerRate}%</p>
            <p className="text-xs text-zinc-500">Answered calls / total calls</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">Interest rate</p>
            <p className="text-2xl font-semibold">{dashboard.interestRate}%</p>
            <p className="text-xs text-zinc-500">Interested / answered calls</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">Meeting rate</p>
            <p className="text-2xl font-semibold">{dashboard.meetingRate}%</p>
            <p className="text-xs text-zinc-500">Meetings booked / answered calls</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">Close rate</p>
            <p className="text-2xl font-semibold">{dashboard.closeRate}%</p>
            <p className="text-xs text-zinc-500">Closed won deals / interested calls</p>
          </div>
        </CardContent>
      </Card>

      <RecentCampaignsCard campaigns={campaigns} />
    </main>
  );
}

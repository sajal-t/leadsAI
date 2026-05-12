import Link from "next/link";
import { Calendar, DollarSign, Globe, Mail, Phone, PhoneIncoming, ThumbsUp, TrendingUp, Users } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { MetricCard } from "@/components/app/metric-card";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { RecentCampaignsCard } from "@/components/dashboard/recent-campaigns-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dbAdmin } from "@/lib/db";
import { DEV_USER } from "@/lib/dev-user";
import { safeRate } from "@/lib/dashboard-metrics";

export default async function DashboardPage() {
  const db = dbAdmin();
  const [campaignsRes, businesses, calls, sites, emails, deals] = await Promise.all([
    db.from("campaigns").select("*").eq("user_id", DEV_USER.id).order("created_at", { ascending: false }).limit(5),
    db.from("businesses").select("id").eq("user_id", DEV_USER.id),
    db.from("call_logs").select("outcome,answered").eq("user_id", DEV_USER.id),
    db.from("generated_sites").select("id").eq("user_id", DEV_USER.id),
    db.from("generated_emails").select("id,status").eq("user_id", DEV_USER.id),
    db.from("deals").select("stage,monthly_fee").eq("user_id", DEV_USER.id),
  ]);
  const c = calls.data ?? [];
  const answered = c.filter((x) => x.answered || (x.answered == null && x.outcome !== "no_answer" && x.outcome !== "voicemail")).length;
  const interested = c.filter((x) => x.outcome === "interested").length;
  const meetings = c.filter((x) => x.outcome === "meeting_booked").length;
  const won = (deals.data ?? []).filter((d) => d.stage === "closed_won");
  const mrr = won.reduce((s, d) => s + Number(d.monthly_fee ?? 0), 0);
  const metrics = [["Total leads", (businesses.data?.length ?? 0).toLocaleString(), Users], ["Calls made", c.length.toLocaleString(), Phone], ["Answer rate", `${safeRate(answered, c.length)}%`, PhoneIncoming], ["No answer", String(c.filter((x) => x.outcome === "no_answer").length), Phone], ["Voicemails", String(c.filter((x) => x.outcome === "voicemail").length), Phone], ["Interested leads", String(interested), ThumbsUp], ["Info requested", String(c.filter((x) => x.outcome === "send_info").length), Mail], ["Callbacks", String(c.filter((x) => x.outcome === "callback").length), PhoneIncoming], ["Meetings booked", String(meetings), Calendar], ["Website previews generated", String(sites.data?.length ?? 0), Globe], ["Follow-up emails generated", String(emails.data?.length ?? 0), Mail], ["Emails sent", String((emails.data ?? []).filter((e) => e.status === "sent").length), Mail], ["Closed clients", String(won.length), DollarSign], ["MRR", `$${mrr.toLocaleString()}`, DollarSign], ["ARR", `$${(mrr * 12).toLocaleString()}`, TrendingUp]] as const;
  const campaigns = (campaignsRes.data ?? []).map((x) => ({ id: x.id as string, niche: x.niche as string, city: x.city as string }));

  return <AppShell><PageHeader title="Dashboard" subtitle="Your LocalLead AI sales workspace at a glance." actions={<div className="flex gap-2"><Link href="/campaigns/new"><Button>Create Campaign</Button></Link><Link href="/campaigns/new"><Button variant="outline">Find Leads</Button></Link></div>} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(([t, v, i]) => <MetricCard key={t} title={t} value={v} icon={i} />)}</div><div className="mt-6 grid gap-4 lg:grid-cols-3"><div className="lg:col-span-2"><RecentCampaignsCard campaigns={campaigns} /></div><Card className="rounded-2xl border-border/50 bg-card/50"><CardHeader><CardTitle className="text-base">Pipeline summary</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-muted-foreground"><div className="flex justify-between"><span>Interest rate</span><StatusBadge label={`${safeRate(interested, answered)}%`} /></div><div className="flex justify-between"><span>Meeting rate</span><StatusBadge label={`${safeRate(meetings, answered)}%`} /></div><div className="flex justify-between"><span>Close rate</span><StatusBadge label={`${safeRate(won.length, interested)}%`} /></div></CardContent></Card></div>{campaigns.length === 0 ? <div className="mt-6"><EmptyState title="Create your first campaign to start finding leads." /></div> : null}</AppShell>;
}

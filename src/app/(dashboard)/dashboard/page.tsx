import Link from "next/link";
import { formatDistanceToNow, subDays } from "date-fns";
import { ArrowRight, Globe, List, Phone, Plus, Search, Sparkles } from "lucide-react";
import { dbAdmin } from "@/lib/db";
import { safeRate } from "@/lib/dashboard-metrics";
import { getDashboardUser } from "@/lib/dashboard-user";
import { redirect } from "next/navigation";
import { DashboardHomeCharts } from "./dashboard-home-charts";

type ActivityRow = {
  id: string;
  label: string;
  at: string;
  tone: "blue" | "green" | "search";
};

export default async function DashboardHomePage() {
  const user = await getDashboardUser();
  if (!user) redirect("/login");
  const db = dbAdmin();
  const userId = user.id;
  const firstName = user.displayName;

  const [
    businessesRes,
    callsRes,
    dealsRes,
    campaignsRes,
    recentCallsRes,
    recentDealsRes,
    recentSearchesRes,
    callsSeriesRes,
  ] = await Promise.all([
    db.from("businesses").select("id").eq("user_id", userId),
    db.from("call_logs").select("id,outcome,answered,created_at").eq("user_id", userId),
    db.from("deals").select("id,stage,monthly_fee,setup_fee,created_at,closed_at").eq("user_id", userId),
    db.from("campaigns").select("id,niche,city").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    db
      .from("call_logs")
      .select("id,created_at,outcome,businesses(name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6),
    db.from("deals").select("id,stage,created_at,businesses(name)").eq("user_id", userId).order("created_at", { ascending: false }).limit(4),
    db
      .from("campaigns")
      .select("id,niche,city,last_places_search_at,last_discovery_at")
      .eq("user_id", userId)
      .limit(40),
    db.from("call_logs").select("created_at").eq("user_id", userId).gte("created_at", subDays(new Date(), 7).toISOString()),
  ]);

  const businesses = businessesRes.data ?? [];
  const calls = callsRes.data ?? [];
  const deals = dealsRes.data ?? [];
  const answered = calls.filter(
    (x) => x.answered || (x.answered == null && x.outcome !== "no_answer" && x.outcome !== "voicemail"),
  ).length;
  const interested = calls.filter((x) => x.outcome === "interested").length;
  const won = deals.filter((d) => d.stage === "closed_won");
  const monthlyRevenue = won.reduce((s, d) => s + Number(d.monthly_fee ?? 0), 0);
  const setupRevenue = won.reduce((s, d) => s + Number(d.setup_fee ?? 0), 0);
  const totalRevenue = setupRevenue + monthlyRevenue;
  const conversionPct = safeRate(interested, answered);
  const campaigns = campaignsRes.data ?? [];

  const byDay: number[] = [0, 0, 0, 0, 0, 0, 0];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  for (const row of callsSeriesRes.data ?? []) {
    const d = new Date(row.created_at as string);
    const day = Math.floor((d.getTime() - start.getTime()) / 864e5);
    if (day >= 0 && day < 7) byDay[day] += 1;
  }
  const callsThisWeek = byDay.reduce((a, b) => a + b, 0);

  const searchedRaw = recentSearchesRes.data ?? [];
  const recentSearches = searchedRaw
    .filter((s) => s.last_discovery_at || s.last_places_search_at)
    .sort((a, b) => {
      const ta = new Date(String(a.last_discovery_at ?? a.last_places_search_at)).getTime();
      const tb = new Date(String(b.last_discovery_at ?? b.last_places_search_at)).getTime();
      return tb - ta;
    })
    .slice(0, 8);

  const activity: ActivityRow[] = [];
  for (const s of recentSearches) {
    const at = (s.last_discovery_at ?? s.last_places_search_at) as string | null;
    if (!at) continue;
    activity.push({
      id: `search-${s.id}-${at}`,
      label: `Campaign updated — ${String(s.niche)} in ${String(s.city)}`,
      at,
      tone: "search",
    });
  }
  for (const c of recentCallsRes.data ?? []) {
    const b = c.businesses as { name?: string } | null;
    activity.push({
      id: `call-${c.id}`,
      label: `Call — ${b?.name ?? "Business"} (${String(c.outcome).replace(/_/g, " ")})`,
      at: c.created_at as string,
      tone: "blue",
    });
  }
  for (const d of recentDealsRes.data ?? []) {
    const b = d.businesses as { name?: string } | null;
    activity.push({
      id: `deal-${d.id}`,
      label: `Deal — ${b?.name ?? "Business"} (${d.stage})`,
      at: d.created_at as string,
      tone: "green",
    });
  }
  activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const activityTop = activity.slice(0, 8);

  const kpis = [
    { label: "Leads", value: businesses.length.toLocaleString(), hint: "In workspace" },
    { label: "Calls", value: calls.length.toLocaleString(), hint: "Logged" },
    {
      label: "Revenue",
      value: `$${totalRevenue.toLocaleString()}`,
      hint:
        won.length === 0
          ? "Add amounts when you close deals"
          : setupRevenue > 0 && monthlyRevenue > 0
            ? `${won.length} closed · setup + monthly`
            : `${won.length} closed`,
    },
    { label: "Conversion", value: `${conversionPct}%`, hint: "Interested ÷ answered" },
  ];

  const quickLinks = [
    { href: "/campaigns/new", icon: Search, label: "New campaign", desc: "Search by niche & city" },
    { href: "/dashboard/leads", icon: List, label: "Browse leads", desc: "Your saved list" },
    { href: "/dashboard/calls", icon: Phone, label: "Log a call", desc: "Track outcomes" },
    { href: "/dashboard/scripts", icon: Sparkles, label: "AI scripts", desc: "Cold-call copy" },
    { href: "/dashboard/websites", icon: Globe, label: "Website studio", desc: "Preview pages" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Welcome back, {firstName}</h1>
          <p className="mt-1 text-sm text-neutral-500">Pipeline overview for your agency.</p>
        </div>
        <Link
          href="/campaigns/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-neutral-900 px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-neutral-800"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New campaign
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{k.label}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-neutral-900 sm:text-3xl">{k.value}</p>
            <p className="mt-1 text-xs text-neutral-500">{k.hint}</p>
          </div>
        ))}
      </div>

      {callsThisWeek > 0 && (
        <section className="rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-900">Calls this week</p>
              <p className="text-xs text-neutral-500">{callsThisWeek} logged in the last 7 days</p>
            </div>
          </div>
          <div className="mt-3 h-12">
            <DashboardHomeCharts series={byDay} />
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-neutral-900">Recent activity</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            {activityTop.length === 0 ? (
              <p className="p-8 text-center text-sm text-neutral-500">
                No activity yet.{" "}
                <Link href="/campaigns/new" className="font-medium text-blue-600 hover:underline">
                  Start a campaign
                </Link>{" "}
                or log your first call.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {activityTop.map((row) => (
                  <li key={row.id} className="flex gap-3 px-4 py-3.5">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneDot(row.tone)}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-neutral-900">{row.label}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {formatDistanceToNow(new Date(row.at), { addSuffix: true })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-neutral-900">Quick links</h2>
            <nav className="mt-3 flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-2 shadow-sm">
              {quickLinks.map((item) => (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-neutral-50"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-blue-500" strokeWidth={1.75} />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-neutral-900">{item.label}</span>
                    <span className="block text-xs text-neutral-500">{item.desc}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-neutral-300" aria-hidden />
                </Link>
              ))}
            </nav>
          </section>

          {campaigns.length > 0 && (
            <section>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-neutral-900">Campaigns</h2>
                <Link href="/dashboard/leads" className="text-xs font-medium text-blue-600 hover:underline">
                  View all
                </Link>
              </div>
              <ul className="mt-3 flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-2 shadow-sm">
                {campaigns.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="block rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-neutral-50"
                    >
                      <span className="font-medium text-neutral-900">{c.niche}</span>
                      <span className="text-neutral-500"> · {c.city}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function toneDot(tone: ActivityRow["tone"]) {
  const map = { blue: "bg-blue-500", green: "bg-emerald-500", search: "bg-neutral-400" } as const;
  return map[tone];
}

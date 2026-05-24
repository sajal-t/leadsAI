"use client";

import { useMemo, useState } from "react";
import { subDays } from "date-fns";
import { Area, AreaChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

const RANGE = ["7d", "30d", "90d"] as const;

export function AnalyticsCharts({
  calls,
  leads,
  deals,
}: {
  calls: string[];
  leads: string[];
  deals: { at: string; stage: string; amount: number }[];
}) {
  const [range, setRange] = useState<(typeof RANGE)[number]>("30d");
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;

  const series = useMemo(() => {
    const cutoff = subDays(new Date(), days).getTime();
    const filterDates = (isoList: string[]) => isoList.filter((iso) => new Date(iso).getTime() >= cutoff);
    const buckets: Record<string, { date: string; calls: number; leads: number; revenue: number }> = {};
    const keyFor = (t: number) => {
      const d = new Date(t);
      return d.toISOString().slice(0, 10);
    };
    const bump = (iso: string, field: "calls" | "leads") => {
      const k = keyFor(new Date(iso).getTime());
      if (!buckets[k]) buckets[k] = { date: k, calls: 0, leads: 0, revenue: 0 };
      buckets[k][field] += 1;
    };
    filterDates(calls).forEach((d) => bump(d, "calls"));
    filterDates(leads).forEach((d) => bump(d, "leads"));
    deals
      .filter((d) => new Date(d.at).getTime() >= cutoff && d.stage === "closed_won")
      .forEach((d) => {
        const k = keyFor(new Date(d.at).getTime());
        if (!buckets[k]) buckets[k] = { date: k, calls: 0, leads: 0, revenue: 0 };
        buckets[k].revenue += d.amount;
      });
    return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
  }, [calls, leads, deals, days]);

  const totals = useMemo(() => {
    const cutoff = subDays(new Date(), days).getTime();
    const filterDates = (isoList: string[]) => isoList.filter((iso) => new Date(iso).getTime() >= cutoff);
    const c = filterDates(calls).length;
    const l = filterDates(leads).length;
    const rev = deals
      .filter((x) => new Date(x.at).getTime() >= cutoff && x.stage === "closed_won")
      .reduce((s, x) => s + x.amount, 0);
    return { c, l, rev };
  }, [calls, leads, deals, days]);

  const pieData = [
    { name: "Calls", value: totals.c, color: "#3B82F6" },
    { name: "Leads", value: totals.l, color: "#171717" },
  ].filter((x) => x.value > 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {RANGE.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              range === r ? "bg-neutral-900 text-white" : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {r === "7d" ? "7D" : r === "30d" ? "30D" : "90D"}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="min-h-[280px] min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-neutral-900">Activity</p>
          <div className="h-[240px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#737373" />
                <YAxis tick={{ fontSize: 10 }} stroke="#737373" />
                <Tooltip />
                <Area type="monotone" dataKey="leads" stackId="1" stroke="#3B82F6" fill="#93C5FD" name="Leads" />
                <Area type="monotone" dataKey="calls" stackId="2" stroke="#171717" fill="#D4D4D4" name="Calls" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="min-h-[280px] w-full max-w-md min-w-0 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-neutral-900">Mix</p>
          <div className="h-[240px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        {[
          ["Revenue", `$${totals.rev.toLocaleString()}`],
          ["Leads", String(totals.l)],
          ["Calls", String(totals.c)],
        ].map(([t, v]) => (
          <div key={t} className="min-w-[140px] flex-1 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{t}</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

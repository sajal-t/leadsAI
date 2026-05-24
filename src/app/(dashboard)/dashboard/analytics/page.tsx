import { redirect } from "next/navigation";
import { subDays } from "date-fns";
import { dbAdmin } from "@/lib/db";
import { getDashboardUser } from "@/lib/dashboard-user";
import { AnalyticsCharts } from "./analytics-charts";

export default async function AnalyticsPage() {
  const user = await getDashboardUser();
  if (!user) redirect("/login");
  const since = subDays(new Date(), 30).toISOString();
  const db = dbAdmin();
  const [calls, businesses, deals] = await Promise.all([
    db.from("call_logs").select("created_at").eq("user_id", user.id).gte("created_at", since),
    db.from("businesses").select("created_at").eq("user_id", user.id).gte("created_at", since),
    db.from("deals").select("created_at,monthly_fee,setup_fee,stage").eq("user_id", user.id).gte("created_at", since),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Analytics</h1>
          <p className="mt-1 text-neutral-500">Last 30 days snapshot.</p>
        </div>
      </div>
      <AnalyticsCharts
        calls={(calls.data ?? []).map((r) => r.created_at as string)}
        leads={(businesses.data ?? []).map((r) => r.created_at as string)}
        deals={(deals.data ?? []).map((r) => ({
          at: r.created_at as string,
          stage: r.stage as string,
          amount: Number(r.setup_fee ?? 0) + Number(r.monthly_fee ?? 0),
        }))}
      />
    </div>
  );
}

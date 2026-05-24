import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { dbAdmin } from "@/lib/db";
import { getDashboardUser } from "@/lib/dashboard-user";
import { formatMoney, sumDealRevenue } from "@/lib/deal-revenue";
import { Button } from "@/components/ui/button";
import { LogCallDialog } from "./log-call-dialog";
import { CallOutcomeBadge } from "./call-outcome-badge";
import { EditDealRevenueDialog } from "@/components/calls/edit-deal-revenue-dialog";

export default async function CallsPage() {
  const user = await getDashboardUser();
  if (!user) redirect("/login");
  const db = dbAdmin();

  const [{ data: logs }, { data: businesses }, { data: deals }] = await Promise.all([
    db
      .from("call_logs")
      .select("id,created_at,outcome,notes,business_id,businesses(name,phone)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    db.from("businesses").select("id,name,phone").eq("user_id", user.id).order("name", { ascending: true }).limit(200),
    db.from("deals").select("id,business_id,stage,setup_fee,monthly_fee").eq("user_id", user.id),
  ]);

  const rows = logs ?? [];
  const dealByBusiness = new Map(
    (deals ?? []).map((d) => [
      d.business_id as string,
      {
        id: d.id as string,
        stage: d.stage as string,
        setup: Number(d.setup_fee ?? 0),
        monthly: Number(d.monthly_fee ?? 0),
      },
    ]),
  );

  const revenue = sumDealRevenue(
    (deals ?? []).map((d) => ({
      stage: d.stage as string,
      setup_fee: d.setup_fee,
      monthly_fee: d.monthly_fee,
    })),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Call Logger</h1>
          <p className="mt-1 text-neutral-500">Log outcomes and track what you&apos;ve closed.</p>
        </div>
        {(businesses ?? []).length > 0 ? (
          <LogCallDialog businesses={(businesses ?? []) as { id: string; name: string; phone: string | null }[]} />
        ) : (
          <Button asChild variant="outline" className="rounded-full border-neutral-200">
            <Link href="/dashboard/leads">Add leads first</Link>
          </Button>
        )}
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Monthly recurring (MRR)</p>
          <p className="mt-2 text-3xl font-bold text-neutral-900">{formatMoney(revenue.mrr)}</p>
          <p className="mt-1 text-xs text-neutral-500">{revenue.wonCount} closed client{revenue.wonCount === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Setup fees collected</p>
          <p className="mt-2 text-3xl font-bold text-neutral-900">{formatMoney(revenue.setupTotal)}</p>
          <p className="mt-1 text-xs text-neutral-500">One-time project payments</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">First-month value</p>
          <p className="mt-2 text-3xl font-bold text-emerald-950">{formatMoney(revenue.setupTotal + revenue.mrr)}</p>
          <p className="mt-1 text-xs text-emerald-800/80">Setup + first month of MRR</p>
        </div>
      </section>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-medium uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Outcome</th>
              <th className="px-4 py-3">Revenue</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                  No calls yet. Log your first call or open a business workspace.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const b = row.businesses as { name?: string; phone?: string | null } | null;
                const bid = row.business_id as string;
                const deal = dealByBusiness.get(bid);
                const hasRevenue = deal && deal.stage === "closed_won" && (deal.setup > 0 || deal.monthly > 0);
                const outcome = row.outcome as string;

                return (
                  <tr key={row.id as string} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-neutral-900">{b?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-600">{b?.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-600">{format(new Date(row.created_at as string), "MMM d, h:mm a")}</td>
                    <td className="px-4 py-3">
                      <CallOutcomeBadge outcome={outcome} />
                    </td>
                    <td className="px-4 py-3 text-neutral-800">
                      {hasRevenue ? (
                        <div className="text-xs leading-relaxed">
                          {deal.setup > 0 && <div>Setup {formatMoney(deal.setup)}</div>}
                          {deal.monthly > 0 && <div>MRR {formatMoney(deal.monthly)}/mo</div>}
                        </div>
                      ) : deal?.stage === "closed_won" ? (
                        <span className="text-xs text-amber-700">Not set</span>
                      ) : (
                        <span className="text-xs text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-neutral-600">{(row.notes as string | null) ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <EditDealRevenueDialog
                          businessId={bid}
                          businessName={b?.name ?? "Business"}
                          initialSetup={deal?.setup}
                          initialMonthly={deal?.monthly}
                          triggerLabel={hasRevenue ? "Edit $" : "Add $"}
                        />
                        <Button asChild variant="outline" size="sm" className="rounded-full border-neutral-200">
                          <Link href={`/businesses/${bid}`}>Open</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

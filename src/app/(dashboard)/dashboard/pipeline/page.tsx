import { redirect } from "next/navigation";
import { dbAdmin } from "@/lib/db";
import { getDashboardUser } from "@/lib/dashboard-user";
import { PipelineKanban, type DealCard } from "./pipeline-kanban";

export default async function PipelinePage() {
  const user = await getDashboardUser();
  if (!user) redirect("/login");
  const { data: deals } = await dbAdmin()
    .from("deals")
    .select("id,stage,monthly_fee,setup_fee,businesses(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const cards: DealCard[] = (deals ?? []).map((d) => {
    const raw = d.businesses as { name: string } | { name: string }[] | null;
    const biz = Array.isArray(raw) ? raw[0] ?? null : raw;
    return {
      id: d.id as string,
      stage: d.stage as string,
      monthly_fee: d.monthly_fee as number | null,
      setup_fee: d.setup_fee as number | null,
      businesses: biz,
    };
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Pipeline</h1>
        <p className="mt-1 text-neutral-500">Drag deals between stages. Changes save automatically.</p>
      </div>
      <PipelineKanban initialDeals={cards} />
    </div>
  );
}

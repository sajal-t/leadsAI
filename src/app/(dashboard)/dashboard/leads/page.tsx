import Link from "next/link";
import { redirect } from "next/navigation";
import { dbAdmin } from "@/lib/db";
import { getDashboardUser } from "@/lib/dashboard-user";
import { PITCH_LIST_STATUSES } from "@/lib/lead-sources/website-detection";
import { Button } from "@/components/ui/button";
import { LeadFinderClient, type LeadRow } from "./lead-finder-client";

export default async function LeadFinderPage({
  searchParams,
}: {
  searchParams: Promise<{ noWebsite?: string; q?: string }>;
}) {
  const user = await getDashboardUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const noWebsiteOnly = sp.noWebsite !== "0";

  let q = dbAdmin()
    .from("businesses")
    .select(
      "id,name,address,phone,email,website_url,website_status,google_maps_url,rating,review_count,campaigns(niche,city)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(150);
  if (noWebsiteOnly) {
    q = q.in("website_status", Array.from(PITCH_LIST_STATUSES));
  }
  const { data: rows } = await q;

  const leads: LeadRow[] = (rows ?? []).map((r) => {
    const camp = r.campaigns as { niche?: string; city?: string } | null;
    return {
      id: r.id as string,
      name: r.name as string,
      address: r.address as string,
      phone: (r.phone as string | null) ?? null,
      email: (r.email as string | null) ?? null,
      website_url: (r.website_url as string | null) ?? null,
      website_status: r.website_status as string,
      google_maps_url: (r.google_maps_url as string | null) ?? null,
      rating: (r.rating as number | null) ?? null,
      review_count: (r.review_count as number | null) ?? null,
      niche: camp?.niche ?? "",
      city: camp?.city ?? "",
    };
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Leads</h1>
          <p className="mt-1 text-sm text-neutral-500">Qualified businesses saved across your campaigns.</p>
        </div>
        <Button asChild className="shrink-0 rounded-full bg-neutral-900 text-white hover:bg-neutral-800">
          <Link href="/campaigns/new">New campaign</Link>
        </Button>
      </div>

      <LeadFinderClient initialLeads={leads} initialNoWebsite={noWebsiteOnly} />
    </div>
  );
}

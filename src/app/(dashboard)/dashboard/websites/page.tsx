import Link from "next/link";
import { redirect } from "next/navigation";
import { Globe, Plus } from "lucide-react";
import { dbAdmin } from "@/lib/db";
import { getDashboardUser } from "@/lib/dashboard-user";

export default async function WebsitesPage() {
  const user = await getDashboardUser();
  if (!user) redirect("/login");
  const { data: sites } = await dbAdmin()
    .from("generated_sites")
    .select("id,preview_slug,status,created_at,ai_site_project_id,businesses(name,id)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Website Studio</h1>
        <p className="mt-1 text-neutral-500">Open a project to edit in the AI studio or create from a business.</p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
        <Link
          href="/dashboard/leads"
          className="flex min-h-[160px] min-w-[200px] flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-neutral-600 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
        >
          <Plus className="h-8 w-8 text-blue-500" />
          <p className="mt-2 font-medium text-neutral-900">Create new website</p>
          <p className="mt-1 text-center text-sm text-neutral-500">Start from a lead</p>
        </Link>
        {(sites ?? []).map((s) => {
          const b = s.businesses as { name?: string; id?: string } | null;
          const pid = s.ai_site_project_id as string | null;
          const href = pid ? `/studio/${pid}` : `/businesses/${b?.id ?? ""}`;
          return (
            <div
              key={s.id as string}
              className="flex min-h-[160px] min-w-[200px] flex-1 flex-col rounded-lg border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-24 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400">
                <Globe className="h-10 w-10" />
              </div>
              <p className="mt-3 font-semibold text-neutral-900">{b?.name ?? "Website"}</p>
              <span className="mt-1 inline-flex w-fit rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                {(s.status as string) || "draft"}
              </span>
              <p className="mt-2 text-xs text-neutral-500">{new Date(s.created_at as string).toLocaleDateString()}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={href} className="text-sm font-medium text-blue-500 hover:underline">
                  Edit
                </Link>
                {s.preview_slug && (
                  <Link href={`/preview/${s.preview_slug}`} className="text-sm font-medium text-blue-500 hover:underline">
                    Preview
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { dbAdmin } from "@/lib/db";
import { getDashboardUser } from "@/lib/dashboard-user";

export default async function ScriptsPage() {
  const user = await getDashboardUser();
  if (!user) redirect("/login");
  const { data: rows } = await dbAdmin()
    .from("generated_scripts")
    .select("id,created_at,angle,version_number,businesses(name,id)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">AI Scripts</h1>
        <p className="mt-1 text-neutral-500">Generate scripts from a business workspace, or open one below.</p>
      </div>
      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-neutral-600">
          Full generator with tone and type lives on each business page. This list shows saved script versions.
        </p>
        <ButtonLink className="mt-4 inline-block" href="/dashboard/leads">
          Pick a lead
        </ButtonLink>
      </div>
      <div className="flex flex-col gap-3">
        {(rows ?? []).length === 0 ? (
          <p className="text-sm text-neutral-500">No scripts saved yet.</p>
        ) : (
          (rows ?? []).map((r) => {
            const b = r.businesses as { name?: string; id?: string } | null;
            return (
              <Link
                key={r.id as string}
                href={`/businesses/${b?.id ?? ""}`}
                className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <p className="font-medium text-neutral-900">{b?.name ?? "Business"}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {r.angle ? String(r.angle) : "Script"} · v{r.version_number ?? 1} ·{" "}
                  {new Date(r.created_at as string).toLocaleDateString()}
                </p>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

function ButtonLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 ${className ?? ""}`}
    >
      {children}
    </Link>
  );
}

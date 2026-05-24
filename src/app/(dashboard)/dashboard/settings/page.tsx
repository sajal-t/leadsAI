import { redirect } from "next/navigation";
import { getDashboardUser } from "@/lib/dashboard-user";
import { ClearWorkspaceButton } from "@/components/dashboard/clear-workspace-button";
import { SettingsTabs } from "./settings-tabs";

export default async function SettingsPage() {
  const user = await getDashboardUser();
  if (!user) redirect("/login");
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Settings</h1>
        <p className="mt-1 text-neutral-500">Profile and workspace preferences.</p>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <SettingsTabs initialName={user.name} initialEmail={user.email} />
      </div>
      <section className="rounded-xl border border-red-100 bg-red-50/40 p-6">
        <h2 className="text-sm font-semibold text-neutral-900">Danger zone</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Permanently remove all campaigns, leads, calls, and generated assets from your workspace.
        </p>
        <div className="mt-4">
          <ClearWorkspaceButton compact />
        </div>
      </section>
    </div>
  );
}

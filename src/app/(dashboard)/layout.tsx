import { redirect } from "next/navigation";
import { getDashboardUser } from "@/lib/dashboard-user";
import { DashboardShell } from "@/components/dashboard-shell/dashboard-shell";
import { BillingProvider } from "@/contexts/billing-context";

export default async function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await getDashboardUser();
  if (!user) redirect("/login");
  return (
    <BillingProvider>
      <DashboardShell user={user}>{children}</DashboardShell>
    </BillingProvider>
  );
}

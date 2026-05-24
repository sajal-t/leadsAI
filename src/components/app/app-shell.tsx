"use client";

import type { ReactNode } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardShell } from "@/components/dashboard-shell/dashboard-shell";
import { BillingProvider } from "@/contexts/billing-context";
import type { DashboardUser } from "@/lib/dashboard-user";
import { Skeleton } from "@/components/ui/skeleton";

type MeResponse = {
  user: DashboardUser;
};

async function fetcher(url: string): Promise<MeResponse> {
  const res = await fetch(url);
  if (res.status === 401) throw new Error("401");
  if (!res.ok) throw new Error("failed");
  return res.json();
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data, error, isLoading } = useSWR("/api/me", fetcher, { revalidateOnFocus: true });

  useEffect(() => {
    if (error?.message === "401") router.replace("/login");
  }, [error, router]);

  if (isLoading || !data?.user) {
    return (
      <div className="min-h-screen bg-neutral-50 p-8">
        <Skeleton className="mx-auto h-12 max-w-7xl" />
        <Skeleton className="mx-auto mt-4 h-64 max-w-7xl" />
      </div>
    );
  }

  return (
    <BillingProvider>
      <DashboardShell user={data.user}>{children}</DashboardShell>
    </BillingProvider>
  );
}

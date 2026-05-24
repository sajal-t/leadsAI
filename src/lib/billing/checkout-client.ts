import type { BillingPlan } from "@/lib/billing/plans";

type CheckoutResult = { ok: true; url: string } | { ok: false; error: string };

export async function startPlanCheckout(plan: Exclude<BillingPlan, "free">): Promise<CheckoutResult> {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok || !data?.url) {
    return { ok: false, error: data?.error ?? "Could not start checkout." };
  }
  return { ok: true, url: data.url };
}

export async function startBillingPortal(): Promise<CheckoutResult> {
  const res = await fetch("/api/billing/portal", { method: "POST" });
  const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok || !data?.url) {
    return { ok: false, error: data?.error ?? "Could not open billing portal." };
  }
  return { ok: true, url: data.url };
}

export async function mockActivatePlan(plan: BillingPlan): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/billing/mock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) {
    return { ok: false, error: data?.error ?? "Mock activation failed." };
  }
  return { ok: true };
}

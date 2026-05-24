import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { isStripeConfigured } from "@/lib/billing/dev-flags";
import { createBillingPortalSession } from "@/lib/billing/stripe";
import { dbAdmin } from "@/lib/db";

export async function POST() {
  const auth = await getUserOr401();
  if ("error" in auth) return auth.error;

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const db = dbAdmin();
  const { data: profile } = await db
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", auth.user.id)
    .maybeSingle();

  const customerId = profile?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ error: "No Stripe subscription found for this account." }, { status: 400 });
  }

  const url = await createBillingPortalSession(customerId);
  return NextResponse.json({ url });
}

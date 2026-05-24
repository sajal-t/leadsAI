import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authRedirectBase } from "@/lib/auth-config";
import { isStripeConfigured } from "@/lib/billing/dev-flags";
import type { BillingPlan } from "@/lib/billing/plans";
import { BILLING_PLANS, isPaidPlan } from "@/lib/billing/plans";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeClient;
}

const PAID_PLANS = BILLING_PLANS.filter((p) => p !== "free") as Exclude<BillingPlan, "free">[];

export function stripePriceIdForPlan(plan: BillingPlan): string | null {
  if (!isPaidPlan(plan)) return null;
  const envKey = `STRIPE_PRICE_${plan.toUpperCase()}` as const;
  const id = process.env[envKey]?.trim();
  return id || null;
}

export function planFromStripePriceId(priceId: string): BillingPlan | null {
  for (const plan of PAID_PLANS) {
    if (stripePriceIdForPlan(plan) === priceId) return plan;
  }
  return null;
}

export async function getOrCreateStripeCustomer(
  db: SupabaseClient,
  userId: string,
  email: string,
): Promise<string> {
  const stripe = getStripe();
  const { data: profile } = await db
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  });

  await db.from("profiles").update({ stripe_customer_id: customer.id }).eq("id", userId);
  return customer.id;
}

export async function createCheckoutSession(opts: {
  db: SupabaseClient;
  userId: string;
  email: string;
  plan: Exclude<BillingPlan, "free">;
}): Promise<string> {
  const priceId = stripePriceIdForPlan(opts.plan);
  if (!priceId) {
    throw new Error(`Missing Stripe price for plan "${opts.plan}". Set STRIPE_PRICE_${opts.plan.toUpperCase()}.`);
  }

  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer(opts.db, opts.userId, opts.email);
  const base = authRedirectBase();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/dashboard/settings?tab=billing&checkout=success`,
    cancel_url: `${base}/dashboard/settings?tab=billing&checkout=cancelled`,
    client_reference_id: opts.userId,
    metadata: {
      user_id: opts.userId,
      plan: opts.plan,
    },
    subscription_data: {
      metadata: {
        user_id: opts.userId,
        plan: opts.plan,
      },
    },
    allow_promotion_codes: true,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }
  return session.url;
}

export async function createBillingPortalSession(customerId: string): Promise<string> {
  const stripe = getStripe();
  const base = authRedirectBase();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${base}/dashboard/settings?tab=billing`,
  });
  return session.url;
}

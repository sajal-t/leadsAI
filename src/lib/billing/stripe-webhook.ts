import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { activatePlan, downgradeToFree, renewPlanCredits } from "@/lib/billing/billing-service";
import { getStripe, planFromStripePriceId } from "@/lib/billing/stripe";
import type { BillingPlan } from "@/lib/billing/plans";
import { isPaidPlan, normalizePlan } from "@/lib/billing/plans";

function planFromSubscription(subscription: Stripe.Subscription): BillingPlan | null {
  const metaPlan = subscription.metadata?.plan;
  if (metaPlan && isPaidPlan(metaPlan)) return metaPlan;
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) return null;
  return planFromStripePriceId(priceId);
}

function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const parentSub = invoice.parent?.subscription_details?.subscription;
  if (typeof parentSub === "string") return parentSub;

  const legacy = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription;
  if (typeof legacy === "string") return legacy;
  if (legacy && typeof legacy === "object" && "id" in legacy) return legacy.id;
  return null;
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const end = subscription.items.data[0]?.current_period_end;
  if (!end) return null;
  return new Date(end * 1000).toISOString();
}

export async function applySubscriptionToProfile(
  db: SupabaseClient,
  userId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const status = subscription.status;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  const subscriptionId = subscription.id;

  if (status === "active" || status === "trialing") {
    const plan = planFromSubscription(subscription);
    if (!plan) {
      console.error("[stripe] Unknown price on subscription", subscription.id);
      return;
    }
    const periodEnd = subscriptionPeriodEnd(subscription);
    await activatePlan(db, userId, plan, {
      stripeCustomerId: customerId ?? undefined,
      stripeSubscriptionId: subscriptionId,
      creditsPeriodEnd: periodEnd,
      source: "stripe",
    });
    return;
  }

  if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") {
    await downgradeToFree(db, userId, { keepStripeCustomer: true });
  }
}

async function resolveUserIdFromSubscription(
  db: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const fromMeta = subscription.metadata?.user_id;
  if (fromMeta) return fromMeta;

  const { data } = await db
    .from("profiles")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  return data?.id ?? null;
}

export async function handleStripeWebhookEvent(db: SupabaseClient, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id ?? session.client_reference_id;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (!userId || !subscriptionId) return;

      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
      await applySubscriptionToProfile(db, userId, subscription);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = await resolveUserIdFromSubscription(db, subscription);
      if (!userId) return;
      await applySubscriptionToProfile(db, userId, subscription);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = await resolveUserIdFromSubscription(db, subscription);
      if (!userId) return;
      await downgradeToFree(db, userId, { keepStripeCustomer: true });
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.billing_reason !== "subscription_cycle") return;
      const subscriptionId = subscriptionIdFromInvoice(invoice);
      if (!subscriptionId) return;

      const { data: profile } = await db
        .from("profiles")
        .select("id,billing_plan")
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle();
      if (!profile?.id) return;

      const plan = normalizePlan(profile.billing_plan);
      if (!isPaidPlan(plan)) return;
      await renewPlanCredits(db, profile.id, plan, { source: "stripe_invoice" });
      break;
    }
    default:
      break;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserOr401 } from "@/lib/auth";
import { isStripeConfigured } from "@/lib/billing/dev-flags";
import { createCheckoutSession, stripeCheckoutReadiness, stripePriceIdForPlan } from "@/lib/billing/stripe";
import { dbAdmin } from "@/lib/db";

const schema = z.object({
  plan: z.enum(["starter", "pro", "agency"]),
});

export async function POST(request: NextRequest) {
  try {
    return await handleCheckoutPost(request);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[billing checkout] unhandled", msg);
    return NextResponse.json({ error: msg.slice(0, 500) }, { status: 500 });
  }
}

async function handleCheckoutPost(request: NextRequest) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY to Railway and redeploy." },
      { status: 503 },
    );
  }

  let plan: "starter" | "pro" | "agency";
  try {
    plan = schema.parse(await request.json()).plan;
  } catch {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const readiness = stripeCheckoutReadiness();
  const priceHint = readiness.prices[plan].hint;
  if (priceHint) {
    return NextResponse.json({ error: priceHint }, { status: 503 });
  }

  const email = auth.user.email;
  if (!email) {
    return NextResponse.json({ error: "Your account has no email address." }, { status: 400 });
  }

  try {
    const db = dbAdmin();
    const url = await createCheckoutSession({
      db,
      userId: auth.user.id,
      email,
      plan,
    });
    return NextResponse.json({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[billing checkout]", plan, msg);
    const priceId = stripePriceIdForPlan(plan);
    const hint =
      msg.includes("No such price") || msg.includes("resource_missing")
        ? ` Stripe does not recognize ${priceId ?? "this price"}. Use Test mode keys with Test prices (or Live with Live).`
        : "";
    return NextResponse.json({ error: `${msg}${hint}`.slice(0, 500) }, { status: 502 });
  }
}

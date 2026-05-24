import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserOr401 } from "@/lib/auth";
import { isStripeConfigured } from "@/lib/billing/dev-flags";
import { createCheckoutSession } from "@/lib/billing/stripe";
import { dbAdmin } from "@/lib/db";

const schema = z.object({
  plan: z.enum(["starter", "pro", "agency"]),
});

export async function POST(request: NextRequest) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY and price IDs to your environment." },
      { status: 503 },
    );
  }

  const { plan } = schema.parse(await request.json());
  const email = auth.user.email;
  if (!email) {
    return NextResponse.json({ error: "Your account has no email address." }, { status: 400 });
  }

  const db = dbAdmin();
  const url = await createCheckoutSession({
    db,
    userId: auth.user.id,
    email,
    plan,
  });

  return NextResponse.json({ url });
}

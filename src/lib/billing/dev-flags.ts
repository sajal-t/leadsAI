/** Bypass paywall and credits entirely — must be set explicitly (never default). */
export function isBillingDisabled(): boolean {
  return process.env.BILLING_DISABLED === "true";
}

/** Instant plan activation without Stripe — dev/staging only, must be set explicitly. */
export function isMockBillingEnabled(): boolean {
  return process.env.ALLOW_MOCK_BILLING === "true";
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

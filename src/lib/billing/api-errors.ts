import { NextResponse } from "next/server";
import type { SpendResult } from "@/lib/billing/billing-service";

export function billingErrorResponse(result: Extract<SpendResult, { ok: false }>): NextResponse {
  const status = result.reason === "paywall" ? 402 : result.reason === "feature_locked" ? 403 : 402;
  return NextResponse.json(
    {
      error: result.message,
      code: result.reason,
      billing: {
        upgradeRequired: result.reason === "paywall",
        featureLocked: result.reason === "feature_locked",
      },
    },
    { status },
  );
}

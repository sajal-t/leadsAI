import type { SupabaseClient } from "@supabase/supabase-js";
import { isWebSearchConfigured } from "./web-search";

const VERIFY_ACTION = "maps_listing_verify";

export function isGoogleVerificationEnabled(): boolean {
  return process.env.ENABLE_GOOGLE_VERIFICATION === "true";
}

export function googleVerifyCreditsCost(): number {
  const n = Number(process.env.GOOGLE_VERIFY_CREDITS_COST ?? "1");
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function countGoogleVerificationsSince(
  db: SupabaseClient,
  since: Date,
  userId?: string,
): Promise<{ user: number; global: number }> {
  const { count: global } = await db
    .from("api_usage")
    .select("id", { count: "exact", head: true })
    .eq("action", VERIFY_ACTION)
    .gte("created_at", since.toISOString());

  if (!userId) return { user: 0, global: global ?? 0 };

  const { count: user } = await db
    .from("api_usage")
    .select("id", { count: "exact", head: true })
    .eq("action", VERIFY_ACTION)
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());

  return { user: user ?? 0, global: global ?? 0 };
}

export async function assertGoogleVerificationAllowed(
  db: SupabaseClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isGoogleVerificationEnabled()) {
    return {
      ok: false,
      reason:
        "Map listing verification is disabled. Set ENABLE_GOOGLE_VERIFICATION=true to allow it.",
    };
  }

  if (!isWebSearchConfigured()) {
    return {
      ok: false,
      reason:
        "No web search API configured. Set SERPER_API_KEY, TAVILY_API_KEY, or BRAVE_SEARCH_API_KEY.",
    };
  }

  const since = startOfUtcDay();
  const perUserCap = Number(process.env.GOOGLE_VERIFICATION_DAILY_CAP_PER_USER ?? "20");
  const globalCap = Number(process.env.GOOGLE_VERIFICATION_DAILY_CAP_GLOBAL ?? "5000");

  const { user, global } = await countGoogleVerificationsSince(db, since, userId);

  if (Number.isFinite(perUserCap) && perUserCap > 0 && user >= perUserCap) {
    return { ok: false, reason: "Daily verification limit reached for your account." };
  }
  if (Number.isFinite(globalCap) && globalCap > 0 && global >= globalCap) {
    return { ok: false, reason: "Global daily verification cap reached. Try again tomorrow." };
  }

  return { ok: true };
}

export async function logApiUsage(
  db: SupabaseClient,
  row: {
    userId: string | null;
    provider: string;
    action: string;
    estimatedCost?: number;
    creditsUsed?: number;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  await db.from("api_usage").insert({
    user_id: row.userId,
    provider: row.provider,
    action: row.action,
    estimated_cost: row.estimatedCost ?? 0,
    credits_used: row.creditsUsed ?? 0,
    meta: row.meta ?? null,
  });
}

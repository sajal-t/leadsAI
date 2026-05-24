import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function cacheGetJson<T>(
  db: SupabaseClient,
  key: string,
): Promise<T | null> {
  const { data, error } = await db
    .from("discovery_cache")
    .select("payload, expires_at")
    .eq("cache_key", key)
    .maybeSingle();
  if (error || !data) return null;
  const exp = new Date(data.expires_at as string).getTime();
  if (Number.isFinite(exp) && exp < Date.now()) return null;
  return data.payload as T;
}

export async function cacheSetJson(
  db: SupabaseClient,
  key: string,
  payload: unknown,
  ttlMs = DEFAULT_TTL_MS,
): Promise<void> {
  const expires_at = new Date(Date.now() + ttlMs).toISOString();
  await db.from("discovery_cache").upsert(
    { cache_key: key, payload: payload as Record<string, unknown>, expires_at },
    { onConflict: "cache_key" },
  );
}

export function cacheKeyParts(prefix: string, parts: unknown[]): string {
  const h = createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 48);
  return `${prefix}:${h}`;
}

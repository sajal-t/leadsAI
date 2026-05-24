/** When true, skip Supabase login and use the shared dev profile (local only). */
export function isAuthDisabled(): boolean {
  return process.env.DISABLE_AUTH === "true";
}

export function authRedirectBase(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

export function oauthCallbackUrl(next = "/dashboard"): string {
  const base = authRedirectBase();
  const path = `/auth/callback?next=${encodeURIComponent(next)}`;
  return `${base}${path}`;
}

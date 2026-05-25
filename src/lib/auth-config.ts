/** When true, skip Supabase login and use the shared dev profile (local only). */
export function isAuthDisabled(): boolean {
  return process.env.DISABLE_AUTH === "true";
}

export function authRedirectBase(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

/**
 * OAuth/email redirect target. Prefer the browser origin on the client so mobile
 * matches the URL the user actually opened (Railway preview vs custom domain).
 */
export function oauthCallbackUrl(next = "/dashboard", requestOrigin?: string): string {
  const base =
    requestOrigin?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  const path = `/auth/callback?next=${encodeURIComponent(next)}`;
  return `${base}${path}`;
}

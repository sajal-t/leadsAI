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

/** Public site origin behind Railway/Vercel proxies (x-forwarded-host). */
export function requestOriginFromHeaders(request: Request): string {
  const url = new URL(request.url);
  const hostHeader = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const host = hostHeader?.split(",")[0]?.trim();
  if (!host) return url.origin;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    url.protocol.replace(":", "") ||
    "https";
  return `${proto}://${host}`;
}

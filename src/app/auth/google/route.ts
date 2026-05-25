import { NextResponse } from "next/server";
import { oauthCallbackUrl, requestOriginFromHeaders } from "@/lib/auth-config";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side Google OAuth start — reliable on mobile/production (no client fetch hang).
 */
export async function GET(request: Request) {
  const origin = requestOriginFromHeaders(request);
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: oauthCallbackUrl(safeNext, origin),
      queryParams: { prompt: "select_account" },
    },
  });

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  if (data?.url) {
    return NextResponse.redirect(data.url);
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Could not start Google sign-in")}`,
  );
}

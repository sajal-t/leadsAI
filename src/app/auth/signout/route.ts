import { NextResponse } from "next/server";
import { requestOriginFromHeaders } from "@/lib/auth-config";
import { createClient } from "@/lib/supabase/server";

/** Clears Supabase session cookies on the server, then redirects to login. */
export async function GET(request: Request) {
  const origin = requestOriginFromHeaders(request);
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  return NextResponse.redirect(`${origin}/login`);
}

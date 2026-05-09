import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dbAdmin } from "@/lib/db";
import { DEV_USER } from "@/lib/dev-user";

export async function getUserOr401(request?: Request) {
  const admin = dbAdmin();

  // MVP mode: auth disabled, use a shared dev user.
  await admin.from("profiles").upsert({
    id: DEV_USER.id,
    email: DEV_USER.email,
    agency_name: "LocalLead Demo Agency",
  });
  if (process.env.DISABLE_AUTH !== "false") {
    return { user: DEV_USER };
  }

  const authHeader = request?.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token) {
    const {
      data: { user },
      error,
    } = await admin.auth.getUser(token);
    if (!error && user) {
      return { user };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      error: NextResponse.json(
        {
          error: "Unauthorized",
          detail: error?.message ?? "Missing auth session",
        },
        { status: 401 },
      ),
    };
  }
  return { user };
}

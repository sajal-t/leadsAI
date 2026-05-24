import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dbAdmin } from "@/lib/db";
import { isAuthDisabled } from "@/lib/auth-config";
import { DEV_USER } from "@/lib/dev-user";
import { ensureProfile } from "@/lib/ensure-profile";

export async function getUserOr401(request?: Request) {
  if (isAuthDisabled()) {
    const admin = dbAdmin();
    await admin.from("profiles").upsert({
      id: DEV_USER.id,
      email: DEV_USER.email,
      full_name: "Dev",
      agency_name: "LeadForge Demo Agency",
    });
    return { user: DEV_USER };
  }

  const authHeader = request?.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token) {
    const admin = dbAdmin();
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
  await ensureProfile(user);
  return { user };
}

import { createClient } from "@/lib/supabase/server";
import { dbAdmin } from "@/lib/db";
import { isAuthDisabled } from "@/lib/auth-config";
import { DEV_USER } from "@/lib/dev-user";
import { ensureProfile } from "@/lib/ensure-profile";

/**
 * Resolves the same user id as `getUserOr401()` for API routes, but for Server Components.
 * - When `DISABLE_AUTH=true`, uses the shared dev profile (local only).
 * - Otherwise uses the logged-in Supabase user (returns null if not signed in).
 */
export async function getServerUserId(): Promise<string | null> {
  if (isAuthDisabled()) {
    const admin = dbAdmin();
    await admin.from("profiles").upsert({
      id: DEV_USER.id,
      email: DEV_USER.email,
      full_name: "Dev",
      agency_name: "LeadForge Demo Agency",
    });
    return DEV_USER.id;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  await ensureProfile(user);
  return user.id;
}

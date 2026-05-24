import type { User } from "@supabase/supabase-js";
import { dbAdmin } from "@/lib/db";
import { extractFullNameFromAuthUser } from "@/lib/display-name";

export async function ensureProfile(user: User): Promise<void> {
  const admin = dbAdmin();
  const { data: adminUser } = await admin.auth.admin.getUserById(user.id);
  const fullUser = adminUser.user ?? user;
  const googleFirst = extractFullNameFromAuthUser(fullUser);

  const { data: existing } = await admin
    .from("profiles")
    .select("agency_name,full_name")
    .eq("id", user.id)
    .maybeSingle();

  const metaAgency =
    typeof fullUser.user_metadata?.agency_name === "string" ? fullUser.user_metadata.agency_name.trim() : "";
  const agencyName = existing?.agency_name?.trim() || metaAgency || "Your agency";

  const row: Record<string, string | null> = {
    id: user.id,
    email: user.email ?? null,
    agency_name: agencyName,
  };
  if (googleFirst) row.full_name = googleFirst;

  await admin.from("profiles").upsert(row);
}

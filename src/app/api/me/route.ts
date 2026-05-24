import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import {
  extractFullNameFromAuthUser,
  isStaleProfileFullName,
  resolveDisplayName,
} from "@/lib/display-name";
import type { User } from "@supabase/supabase-js";
import { getBillingState } from "@/lib/billing/billing-service";

export async function GET() {
  const auth = await getUserOr401();
  if ("error" in auth) return auth.error;

  const db = dbAdmin();
  const billing = await getBillingState(db, auth.user.id);
  const profileRes = await db.from("profiles").select("email,agency_name,full_name").eq("id", auth.user.id).maybeSingle();
  const profile =
    profileRes.data ??
    (await db.from("profiles").select("email,agency_name").eq("id", auth.user.id).maybeSingle()).data;

  const supabase = await createClient();
  const [{ data: adminAuth }, { data: sessionAuth }] = await Promise.all([
    db.auth.admin.getUserById(auth.user.id),
    supabase.auth.getUser(),
  ]);
  const adminUser = adminAuth.user;
  const sessionUser = sessionAuth.user;
  let googleFirst: string | null = null;
  for (const u of [adminUser, sessionUser]) {
    if (!u) continue;
    googleFirst = extractFullNameFromAuthUser(u);
    if (googleFirst) break;
  }
  const email =
    profile?.email?.trim() ||
    adminUser?.email?.trim() ||
    sessionUser?.email?.trim() ||
    auth.user.email ||
    "";
  const profileFullRaw = (profile as { full_name?: string | null } | null)?.full_name ?? null;
  const profileFull =
    profileFullRaw && !isStaleProfileFullName(profileFullRaw, email) ? profileFullRaw : null;
  const displayName = resolveDisplayName({
    firstName: googleFirst,
    fullName: profileFull,
    email,
  });

  return NextResponse.json({
    user: {
      id: auth.user.id,
      email,
      name: (profile?.agency_name as string | null)?.trim() || "Your agency",
      displayName,
    },
    billing,
  });
}

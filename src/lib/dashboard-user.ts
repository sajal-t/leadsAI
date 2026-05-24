import type { User } from "@supabase/supabase-js";
import { dbAdmin } from "@/lib/db";
import {
  extractFullNameFromAuthUser,
  isStaleProfileFullName,
  resolveDisplayName,
} from "@/lib/display-name";
import { getServerUserId } from "@/lib/server-user";
import { isAuthDisabled } from "@/lib/auth-config";
import { DEV_USER } from "@/lib/dev-user";
import { createClient } from "@/lib/supabase/server";

export type DashboardUser = {
  id: string;
  email: string;
  /** Agency / company label (settings, scripts). */
  name: string;
  /** Personal first name for “Welcome back, …”. */
  displayName: string;
};

type ProfileRow = {
  email?: string | null;
  agency_name?: string | null;
  full_name?: string | null;
};

async function loadProfile(userId: string): Promise<ProfileRow | null> {
  const db = dbAdmin();
  const withName = await db.from("profiles").select("email,agency_name,full_name").eq("id", userId).maybeSingle();
  if (!withName.error) return withName.data;

  const fallback = await db.from("profiles").select("email,agency_name").eq("id", userId).maybeSingle();
  return fallback.data;
}

async function loadAuthUser(userId: string): Promise<User | null> {
  const { data, error } = await dbAdmin().auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  return data.user;
}

async function loadSessionUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function googleFirstNameFromUsers(...users: (User | null | undefined)[]): string | null {
  for (const user of users) {
    if (!user) continue;
    const first = extractFullNameFromAuthUser(user);
    if (first) return first;
  }
  return null;
}

export async function getDashboardUser(): Promise<DashboardUser | null> {
  const userId = await getServerUserId();
  if (!userId) return null;

  const db = dbAdmin();
  const authDisabled = isAuthDisabled();
  const [profile, authUser, sessionUser] = await Promise.all([
    loadProfile(userId),
    authDisabled ? Promise.resolve(null) : loadAuthUser(userId),
    authDisabled ? Promise.resolve(null) : loadSessionUser(),
  ]);

  if (authDisabled) {
    const agencyName = (profile?.agency_name as string | null)?.trim() || "LeadForge Demo Agency";
    return {
      id: userId,
      email: profile?.email?.trim() || DEV_USER.email,
      name: agencyName,
      displayName: "Dev",
    };
  }

  const email =
    authUser?.email?.trim() ||
    sessionUser?.email?.trim() ||
    profile?.email?.trim() ||
    "";

  const googleFirstName = googleFirstNameFromUsers(authUser, sessionUser);
  const profileFullRaw = (profile?.full_name as string | null)?.trim() || null;
  const profileFull =
    profileFullRaw && !isStaleProfileFullName(profileFullRaw, email) ? profileFullRaw : null;

  if (googleFirstName) {
    const patch: Record<string, string> = { full_name: googleFirstName };
    if (email) patch.email = email;
    await db.from("profiles").update(patch).eq("id", userId);
  } else if (profileFullRaw && isStaleProfileFullName(profileFullRaw, email)) {
    await db.from("profiles").update({ full_name: null }).eq("id", userId);
  }

  const agencyName = (profile?.agency_name as string | null)?.trim() || "Your agency";
  const displayName = resolveDisplayName({
    firstName: googleFirstName,
    fullName: profileFull,
    email: email || undefined,
  });

  return {
    id: userId,
    email,
    name: agencyName,
    displayName,
  };
}

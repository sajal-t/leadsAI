import type { User } from "@supabase/supabase-js";

const PLACEHOLDER_FIRST_NAMES = new Set([
  "leadforge",
  "your",
  "there",
  "you",
  "dev",
  "demo",
  "user",
  "test",
]);

function isPlaceholderFirstName(first: string): boolean {
  const lower = first.toLowerCase();
  if (PLACEHOLDER_FIRST_NAMES.has(lower)) return true;
  if (lower.includes("leadforge")) return true;
  return false;
}

function firstNameFromFullName(full: string): string | null {
  const trimmed = full.trim();
  if (!trimmed) return null;
  const first = trimmed.split(/\s+/)[0] ?? "";
  if (!first || isPlaceholderFirstName(first)) return null;
  return first;
}

function nameCandidatesFromRecord(record: Record<string, unknown>): string[] {
  const given = record.given_name;
  const family = record.family_name;
  const combined =
    typeof given === "string" && given.trim() && typeof family === "string" && family.trim()
      ? `${given.trim()} ${family.trim()}`
      : typeof given === "string"
        ? given.trim()
        : null;

  return [
    record.full_name,
    record.name,
    record.display_name,
    combined,
  ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

/** Pull first name from Supabase Auth user (Google OAuth stores data on user_metadata and identities). */
export function extractFullNameFromAuthUser(user: User): string | null {
  for (const c of nameCandidatesFromRecord((user.user_metadata ?? {}) as Record<string, unknown>)) {
    const first = firstNameFromFullName(c);
    if (first) return first;
  }

  for (const identity of user.identities ?? []) {
    const data = identity.identity_data as Record<string, unknown> | undefined;
    if (!data) continue;
    for (const c of nameCandidatesFromRecord(data)) {
      const first = firstNameFromFullName(c);
      if (first) return first;
    }
  }

  return null;
}

/** Stored profile names that are placeholders or literally the email prefix (not real OAuth names). */
export function isStaleProfileFullName(fullName: string | null | undefined, email?: string | null): boolean {
  if (!fullName?.trim()) return true;
  const trimmed = fullName.trim();
  if (!firstNameFromFullName(trimmed)) return true;
  const local = email?.split("@")[0]?.trim().toLowerCase();
  if (!local) return false;
  // Only reject when the whole stored value is the email prefix (e.g. "you" from you@gmail.com).
  if (trimmed.toLowerCase() === local) return true;
  return false;
}

/** First name for greetings. */
export function resolveDisplayName(opts: {
  fullName?: string | null;
  firstName?: string | null;
  email?: string | null;
}): string {
  if (opts.firstName?.trim()) {
    const first = opts.firstName.trim();
    if (!isPlaceholderFirstName(first)) return first;
  }

  if (opts.fullName?.trim() && !isStaleProfileFullName(opts.fullName, opts.email)) {
    const first = firstNameFromFullName(opts.fullName);
    if (first) return first;
  }

  const emailLocal = opts.email?.split("@")[0]?.trim();
  if (emailLocal && emailLocal.length > 1 && !isPlaceholderFirstName(emailLocal)) {
    return emailLocal.charAt(0).toUpperCase() + emailLocal.slice(1);
  }

  return "there";
}

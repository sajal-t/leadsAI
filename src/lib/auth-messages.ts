import type { AuthError, User } from "@supabase/supabase-js";

/** Supabase may return success with empty identities when the email is already registered. */
export function isDuplicateSignupUser(user: User | null | undefined): boolean {
  if (!user) return false;
  const identities = user.identities ?? [];
  return identities.length === 0;
}

export function formatAuthError(error: AuthError | { message: string } | null): string {
  if (!error?.message) return "Something went wrong. Please try again.";
  const msg = error.message;
  const lower = msg.toLowerCase();

  if (
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("user already exists") ||
    lower.includes("email address is already") ||
    lower.includes("email already")
  ) {
    return "An account with this email already exists. Sign in instead, or use “Forgot password” if you need to reset your password.";
  }

  if (lower.includes("invalid login credentials") || lower.includes("invalid email or password")) {
    return "Incorrect email or password. If you signed up with Google, use “Continue with Google” instead.";
  }

  if (lower.includes("email not confirmed")) {
    return "Confirm your email first — check your inbox for the verification link, or sign in with a code.";
  }

  if (lower.includes("database error saving new user")) {
    return (
      msg +
      " Run supabase/migrations/011_fix_signup_profile_trigger.sql in the Supabase SQL Editor, then try again."
    );
  }

  return msg;
}

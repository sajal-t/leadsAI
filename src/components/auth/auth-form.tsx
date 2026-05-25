"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { oauthCallbackUrl } from "@/lib/auth-config";
import { formatAuthError, isDuplicateSignupUser } from "@/lib/auth-messages";
import {
  LOGIN_OTP_PENDING_KEY,
  SIGNUP_PENDING_KEY,
  savePending,
} from "@/components/auth/auth-pending";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  label = "Continue with Google",
  next = "/dashboard",
}: {
  label?: string;
  next?: string;
}) {
  const googleHref = `/auth/google?next=${encodeURIComponent(next)}`;

  return (
    <Button
      variant="outline"
      className="h-11 w-full rounded-full border-neutral-200 bg-white"
      asChild
    >
      <a href={googleHref} className="inline-flex items-center justify-center">
        <GoogleIcon />
        <span className="ml-2">{label}</span>
      </a>
    </Button>
  );
}

export function LoginForm({ initialError }: { initialError?: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(initialError ?? "");

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setMessage(formatAuthError(error));
      setLoading(false);
      return;
    }
    window.location.href = "/dashboard";
  };

  const sendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setMessage("Enter your email first.");
      return;
    }
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) {
      setMessage(formatAuthError(error));
      return;
    }
    savePending(LOGIN_OTP_PENDING_KEY, { email: trimmed });
    router.push("/login/verify");
  };

  return (
    <>
      <GoogleSignInButton />
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-neutral-200" />
        <span className="text-xs uppercase tracking-wide text-neutral-500">or email</span>
        <div className="h-px flex-1 bg-neutral-200" />
      </div>
      <form className="space-y-4" onSubmit={(e) => void signIn(e)}>
        <div className="space-y-2">
          <Label className="text-neutral-700">Email</Label>
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-neutral-700">Password</Label>
            <Link href="/login/forgot-password" className="text-xs font-medium text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-full bg-neutral-900 text-white hover:bg-neutral-800"
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <Button
        type="button"
        variant="outline"
        disabled={loading}
        className="mt-3 h-11 w-full rounded-full border-neutral-200"
        onClick={() => void sendCode()}
      >
        Email me a sign-in code
      </Button>
      {message && <p className="mt-4 text-center text-sm text-red-600">{message}</p>}
      <p className="mt-4 text-center text-xs text-neutral-500">
        <Link href="/login/forgot-email" className="font-medium text-blue-600 hover:underline">
          Forgot which email you used?
        </Link>
      </p>
      <p className="mt-6 text-center text-sm text-neutral-600">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-blue-600 hover:underline">
          Sign up
        </Link>
      </p>
    </>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const submitWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (!agree) {
      setMessage("Please accept the terms.");
      return;
    }
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const origin = typeof window !== "undefined" ? window.location.origin : undefined;
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: trimmedName,
          agency_name: "Your agency",
        },
        emailRedirectTo: oauthCallbackUrl("/dashboard", origin),
      },
    });
    if (error) {
      setMessage(formatAuthError(error));
      setLoading(false);
      return;
    }
    if (isDuplicateSignupUser(data.user)) {
      setMessage(formatAuthError({ message: "User already registered" }));
      setLoading(false);
      return;
    }
    if (data.session) {
      window.location.href = "/dashboard";
      return;
    }
    savePending(SIGNUP_PENDING_KEY, { email: trimmedEmail, fullName: trimmedName });
    router.push("/signup/verify");
  };

  const submitWithOtp = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setMessage("Enter your full name.");
      return;
    }
    if (!agree) {
      setMessage("Please accept the terms.");
      return;
    }
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: true,
        data: {
          full_name: trimmedName,
          agency_name: "Your agency",
        },
      },
    });
    setLoading(false);
    if (error) {
      setMessage(formatAuthError(error));
      return;
    }
    savePending(SIGNUP_PENDING_KEY, { email: trimmedEmail, fullName: trimmedName });
    router.push("/signup/verify");
  };

  const duplicateSignup = message.includes("already exists");

  return (
    <>
      <GoogleSignInButton label="Sign up with Google" />
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-neutral-200" />
        <span className="text-xs uppercase tracking-wide text-neutral-500">or email</span>
        <div className="h-px flex-1 bg-neutral-200" />
      </div>
      <form className="space-y-4" onSubmit={(e) => void submitWithPassword(e)}>
        <div className="space-y-2">
          <Label className="text-neutral-700">Full name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label className="text-neutral-700">Email</Label>
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-neutral-700">Password</Label>
          <PasswordInput
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-neutral-700">Confirm password</Label>
          <PasswordInput
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-neutral-600">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 accent-blue-600" />
          I agree to the Terms of Service and Privacy Policy
        </label>
        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-full bg-neutral-900 text-white hover:bg-neutral-800"
        >
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <Button
        type="button"
        variant="outline"
        disabled={loading}
        className="mt-3 h-11 w-full rounded-full border-neutral-200"
        onClick={() => void submitWithOtp()}
      >
        Sign up with email code instead
      </Button>
      {message && (
        <div className="mt-4 text-center text-sm">
          <p className={message.includes("Check") ? "text-neutral-600" : "text-red-600"}>{message}</p>
          {duplicateSignup ? (
            <p className="mt-2">
              <Link href="/login" className="font-medium text-blue-600 hover:underline">
                Go to sign in
              </Link>
            </p>
          ) : null}
        </div>
      )}
      <p className="mt-8 text-center text-sm text-neutral-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

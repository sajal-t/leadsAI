"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setChecking(false);
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    window.location.href = "/dashboard";
  };

  if (checking) {
    return <p className="text-center text-sm text-neutral-500">Loading…</p>;
  }

  if (!hasSession) {
    return (
      <>
        <p className="text-center text-sm text-neutral-600">
          This reset link is invalid or has expired. Request a new one from the sign-in page.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button asChild className="h-11 w-full rounded-full bg-neutral-900 text-white hover:bg-neutral-800">
            <Link href="/login/forgot-password">Request a new reset link</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full rounded-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <p className="mb-6 text-center text-sm text-neutral-600">Choose a new password for your account.</p>
      <form className="space-y-4" onSubmit={(e) => void submit(e)}>
        <div className="space-y-2">
          <Label className="text-neutral-700">New password</Label>
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
        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-full bg-neutral-900 text-white hover:bg-neutral-800"
        >
          {loading ? "Saving…" : "Save password"}
        </Button>
      </form>
      {message ? <p className="mt-4 text-center text-sm text-red-600">{message}</p> : null}
    </>
  );
}

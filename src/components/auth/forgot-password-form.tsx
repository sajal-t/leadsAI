"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { oauthCallbackUrl } from "@/lib/auth-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: oauthCallbackUrl("/login/reset-password"),
    });

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <>
        <p className="text-center text-sm text-neutral-600">
          If an account exists for <span className="font-medium text-neutral-900">{email.trim()}</span>, we sent a
          password reset link. Open it on this device, then choose a new password.
        </p>
        <p className="mt-6 text-center text-sm text-neutral-600">
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <p className="mb-6 text-center text-sm text-neutral-600">
        Enter your account email and we&apos;ll send a link to reset your password.
      </p>
      <form className="space-y-4" onSubmit={(e) => void submit(e)}>
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
        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-full bg-neutral-900 text-white hover:bg-neutral-800"
        >
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      {message ? <p className="mt-4 text-center text-sm text-red-600">{message}</p> : null}
      <p className="mt-8 text-center text-sm text-neutral-600">
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}

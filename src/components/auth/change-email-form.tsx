"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { oauthCallbackUrl } from "@/lib/auth-config";
import { OtpVerifyForm } from "@/components/auth/otp-verify-form";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ChangeEmailFormProps = {
  currentEmail: string;
};

export function ChangeEmailForm({ currentEmail }: ChangeEmailFormProps) {
  const [step, setStep] = useState<"form" | "verify">("form");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const requestChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newEmail.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === currentEmail.toLowerCase()) {
      setMessage("That is already your email address.");
      return;
    }

    setLoading(true);
    setMessage("");
    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password,
    });
    if (signInError) {
      setLoading(false);
      setMessage("Current password is incorrect.");
      return;
    }

    const { error } = await supabase.auth.updateUser(
      { email: trimmed },
      { emailRedirectTo: oauthCallbackUrl("/dashboard/settings") },
    );

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setStep("verify");
  };

  if (step === "verify") {
    return (
      <OtpVerifyForm
        email={newEmail.trim()}
        type="email_change"
        title="Confirm your new email"
        description={
          <>
            Enter the code we sent to <span className="font-medium text-neutral-900">{newEmail.trim()}</span>
          </>
        }
        backHref="/dashboard/settings"
        backLabel="Back to settings"
        onVerified={() => {
          window.location.href = "/dashboard/settings";
        }}
      />
    );
  }

  return (
    <>
      <p className="text-sm text-neutral-600">
        Current email: <span className="font-medium text-neutral-900">{currentEmail}</span>
      </p>
      <form className="mt-4 space-y-4" onSubmit={(e) => void requestChange(e)}>
        <div className="space-y-2">
          <Label className="text-neutral-700">New email</Label>
          <Input
            type="email"
            autoComplete="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-neutral-700">Current password</Label>
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
          className="rounded-full bg-neutral-900 text-white hover:bg-neutral-800"
        >
          {loading ? "Sending code…" : "Send verification code"}
        </Button>
      </form>
      {message ? <p className="mt-3 text-sm text-red-600">{message}</p> : null}
    </>
  );
}

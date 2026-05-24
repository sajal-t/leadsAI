"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OtpVerifyFormProps = {
  email: string;
  type: "email" | "signup" | "email_change";
  onVerified: () => void;
  backHref: string;
  backLabel?: string;
  title?: string;
  description?: ReactNode;
};

export function OtpVerifyForm({
  email,
  type,
  onVerified,
  backHref,
  backLabel = "Back",
  title = "Enter verification code",
  description,
}: OtpVerifyFormProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.replace(/\D/g, "").trim();
    if (token.length < 6) {
      setMessage("Enter the 6-digit code from your email.");
      return;
    }

    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type,
    });

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    onVerified();
  };

  const resend = async () => {
    setResending(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: type === "signup" },
    });
    setResending(false);
    setMessage(error ? error.message : "We sent a new code. Check your inbox.");
  };

  return (
    <>
      <h2 className="text-center text-lg font-semibold text-neutral-900">{title}</h2>
      <p className="mt-2 text-center text-sm text-neutral-600">
        {description ?? (
          <>
            We sent a 6-digit code to <span className="font-medium text-neutral-900">{email}</span>
          </>
        )}
      </p>
      <form className="mt-6 space-y-4" onSubmit={(e) => void verify(e)}>
        <div className="space-y-2">
          <Label className="text-neutral-700">Verification code</Label>
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={8}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="text-center text-lg tracking-[0.3em]"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-full bg-neutral-900 text-white hover:bg-neutral-800"
        >
          {loading ? "Verifying…" : "Verify"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-neutral-600">
        <button
          type="button"
          className="font-medium text-blue-600 hover:underline disabled:opacity-50"
          disabled={resending}
          onClick={() => void resend()}
        >
          {resending ? "Sending…" : "Resend code"}
        </button>
      </p>
      {message ? (
        <p
          className={`mt-4 text-center text-sm ${message.includes("sent") ? "text-neutral-600" : "text-red-600"}`}
        >
          {message}
        </p>
      ) : null}
      <p className="mt-6 text-center text-sm text-neutral-600">
        <Link href={backHref} className="font-medium text-blue-600 hover:underline">
          {backLabel}
        </Link>
      </p>
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LOGIN_OTP_PENDING_KEY, savePending } from "@/components/auth/auth-pending";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Helps users who forgot which email they used — sends a sign-in code if the account exists. */
export function ForgotEmailForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: false },
    });

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    savePending(LOGIN_OTP_PENDING_KEY, { email: trimmed });
    router.push("/login/verify");
  };

  return (
    <>
      <p className="mb-6 text-center text-sm text-neutral-600">
        Enter the email you think you used. If we find an account, we&apos;ll email you a sign-in code (we won&apos;t
        tell you whether the address is registered).
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
          {loading ? "Sending…" : "Send sign-in code"}
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

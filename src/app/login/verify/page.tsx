"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand/brand-logo";
import { LOGIN_OTP_PENDING_KEY, clearPending, readPending } from "@/components/auth/auth-pending";
import { OtpVerifyForm } from "@/components/auth/otp-verify-form";
import Link from "next/link";

export default function LoginVerifyPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const pending = readPending(LOGIN_OTP_PENDING_KEY);
    if (!pending?.email) {
      router.replace("/login");
      return;
    }
    setEmail(pending.email);
  }, [router]);

  if (!email) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
        <p className="text-sm text-neutral-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-[400px] rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo size="lg" className="justify-center" />
        </div>
        <OtpVerifyForm
          email={email}
          type="email"
          backHref="/login"
          backLabel="Back to sign in"
          onVerified={() => {
            clearPending(LOGIN_OTP_PENDING_KEY);
            window.location.href = "/dashboard";
          }}
        />
        <p className="mt-4 text-center text-xs text-neutral-500">
          Wrong email?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Start over
          </Link>
        </p>
      </div>
    </main>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/brand/brand-logo";
import { LoginForm } from "@/components/auth/auth-form";

export function LoginPageClient() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-[400px] rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo size="lg" className="justify-center" />
          <p className="mt-3 text-sm text-neutral-500">Sign in to your workspace</p>
        </div>
        <LoginForm initialError={error ? decodeURIComponent(error) : null} />
      </div>
    </main>
  );
}

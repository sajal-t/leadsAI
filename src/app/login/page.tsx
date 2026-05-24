import { Suspense } from "react";
import { LoginPageClient } from "./login-client";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
          <p className="text-sm text-neutral-500">Loading…</p>
        </main>
      }
    >
      <LoginPageClient />
    </Suspense>
  );
}

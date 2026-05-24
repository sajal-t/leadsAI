import { BrandLogo } from "@/components/brand/brand-logo";
import { SignupForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-[400px] rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo size="lg" className="justify-center" />
          <p className="mt-3 text-sm text-neutral-500">Create your account</p>
        </div>
        <SignupForm />
      </div>
    </main>
  );
}

import { BrandLogo } from "@/components/brand/brand-logo";
import { ForgotEmailForm } from "@/components/auth/forgot-email-form";

export default function ForgotEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-[400px] rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo size="lg" className="justify-center" />
          <h1 className="mt-4 text-lg font-semibold text-neutral-900">Find your account</h1>
        </div>
        <ForgotEmailForm />
      </div>
    </main>
  );
}

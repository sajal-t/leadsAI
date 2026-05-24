import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

const product = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Pricing", href: "#pricing" },
];

const company = [
  { label: "Sign in", href: "/login" },
  { label: "Create account", href: "/signup" },
  { label: "App dashboard", href: "/dashboard" },
];

const legal = [
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/80">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div>
            <BrandLogo href="/" size="lg" />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              AI-powered sales workspace for finding local businesses without websites and turning them into clients.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</p>
              <ul className="mt-4 space-y-2.5">
                {product.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="text-sm text-foreground/90 hover:text-primary">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company</p>
              <ul className="mt-4 space-y-2.5">
                {company.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-foreground/90 hover:text-primary">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Legal</p>
              <ul className="mt-4 space-y-2.5">
                {legal.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-foreground/90 hover:text-primary">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-12 border-t border-border pt-8 text-center text-xs text-muted-foreground sm:text-left">
          © {new Date().getFullYear()} LeadForge. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

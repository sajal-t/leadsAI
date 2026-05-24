"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

export function Topbar() {
  return (
    <div className="sticky top-0 z-30 mb-4 flex items-center justify-between rounded-2xl border border-border/50 bg-background/70 px-4 py-3 backdrop-blur lg:hidden">
      <BrandLogo href="/dashboard" size="sm" />
      <Link href="/campaigns/new" className="text-sm font-medium text-primary">
        Find Leads
      </Link>
    </div>
  );
}

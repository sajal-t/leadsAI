"use client";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Topbar() {
  return <div className="sticky top-0 z-30 mb-4 flex items-center justify-between rounded-2xl border border-border/50 bg-background/70 px-4 py-3 backdrop-blur lg:hidden"><div className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary"/>LocalLead AI</div><Link href="/campaigns/new" className="text-sm text-primary">Find Leads</Link></div>;
}

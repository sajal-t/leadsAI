"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, PlusSquare, Settings, Target, Users, WandSparkles } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/campaigns", label: "Campaigns", icon: Target },
  { href: "/campaigns/new", label: "New Campaign", icon: PlusSquare },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/studio", label: "AI Studio", icon: WandSparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 rounded-2xl border border-border/50 bg-card/60 p-4 shadow-sm shadow-primary/5 backdrop-blur lg:block">
      <div className="mb-6 px-2">
        <BrandLogo href="/dashboard" size="sm" />
      </div>
      <nav className="space-y-1">
        {nav.map((item) => {
          const active = path === item.href || path.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"}`}>
              <item.icon className="h-4 w-4" />{item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

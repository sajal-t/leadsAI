"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeft,
  Phone,
  Plus,
  Search as SearchIcon,
  Settings,
  Globe,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { CreditsBadge } from "@/components/billing/credits-badge";
import { useBilling } from "@/contexts/billing-context";
import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { DASHBOARD_NAV } from "@/components/dashboard-shell/nav-config";
import type { DashboardUser } from "@/lib/dashboard-user";
import { Button } from "@/components/ui/button";

function crumbTitle(segment: string): string {
  const map: Record<string, string> = {
    dashboard: "Dashboard",
    leads: "Leads",
    calls: "Calls",
    scripts: "Scripts",
    websites: "Websites",
    analytics: "Analytics",
    settings: "Settings",
    campaigns: "Campaigns",
    new: "New campaign",
    businesses: "Lead",
  };
  return map[segment] ?? segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function breadcrumbsForPath(pathname: string): string[] {
  if (pathname === "/dashboard") return ["Dashboard"];
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "dashboard") {
    const rest = parts.slice(1);
    if (rest.length === 0) return ["Dashboard"];
    return ["Dashboard", ...rest.map(crumbTitle)];
  }
  if (parts[0] === "campaigns") {
    if (parts[1] === "new") return ["Dashboard", "New campaign"];
    if (parts[1]) return ["Dashboard", "Campaign"];
    return ["Dashboard", "Campaigns"];
  }
  if (parts[0] === "businesses" && parts[1]) return ["Dashboard", "Lead"];
  if (parts[0] === "studio") return ["Dashboard", "Website studio"];
  return ["Dashboard"];
}

const PATHS_WITHOUT_HEADER_NEW_CAMPAIGN = ["/dashboard", "/dashboard/leads", "/dashboard/calls"];

function showHeaderNewCampaign(pathname: string): boolean {
  return !PATHS_WITHOUT_HEADER_NEW_CAMPAIGN.includes(pathname);
}

function isNavActive(pathname: string, item: (typeof DASHBOARD_NAV)[number]): boolean {
  if (pathname === item.href) return true;
  const prefixes = item.activePrefixes ?? [];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function DashboardShell({
  user,
  children,
}: {
  user: DashboardUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { showPaywall } = useBilling();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  const crumbs = useMemo(() => breadcrumbsForPath(pathname), [pathname]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const NavLink = ({ item, collapsed: c }: { item: (typeof DASHBOARD_NAV)[number]; collapsed: boolean }) => {
    const active = isNavActive(pathname, item);
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
          c && "justify-center px-2",
          active ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-600 hover:bg-neutral-100",
        )}
        title={c ? item.label : undefined}
      >
        <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
        {!c && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-white text-neutral-900">
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-neutral-200 bg-white transition-[width] duration-200 lg:flex",
          collapsed ? "w-16" : "w-[260px]",
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-neutral-200 px-3">
          {!collapsed && (
            <BrandLogo href="/dashboard" size="sm" className="min-w-0 truncate" />
          )}
          {collapsed && (
            <Link href="/dashboard" className="mx-auto" title="LeadForge">
              <BrandLogo showName={false} size="sm" />
            </Link>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {DASHBOARD_NAV.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} />
          ))}
        </nav>
        <div className="border-t border-neutral-200 p-3">
          <Link
            href="/dashboard/settings"
            data-paywall-exempt
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-100",
              pathname.startsWith("/dashboard/settings") && "bg-neutral-100 font-medium text-neutral-900",
            )}
            title={collapsed ? "Settings" : undefined}
          >
            <Settings className="h-5 w-5 shrink-0" strokeWidth={1.75} />
            {!collapsed && <span>Settings</span>}
          </Link>
          <details className="group relative mt-2">
            <summary
              className={cn(
                "flex cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-100 [&::-webkit-details-marker]:hidden",
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700">
                {(user.displayName ?? user.name).slice(0, 1).toUpperCase()}
              </span>
              {!collapsed && (
                <span className="min-w-0 flex-1 truncate text-left">
                  <span className="block truncate font-medium text-neutral-900">{user.displayName ?? user.name}</span>
                  <span className="block truncate text-xs text-neutral-500">{user.email}</span>
                </span>
              )}
            </summary>
            <div className="absolute bottom-full left-0 z-40 mb-1 w-full min-w-[200px] rounded-lg border border-neutral-200 bg-white py-1 shadow-md">
              <button
                type="button"
                data-paywall-exempt
                onClick={() => void signOut()}
                className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
              >
                Log out
              </button>
            </div>
          </details>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col pb-16 lg:pb-0">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
              {crumbs.map((c, i) => (
                <li key={`${c}-${i}`} className="flex items-center gap-2">
                  {i > 0 && <span className="text-neutral-300">/</span>}
                  <span className={cn(i === crumbs.length - 1 && "font-medium text-neutral-900")}>{c}</span>
                </li>
              ))}
            </ol>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <CreditsBadge />
            {showHeaderNewCampaign(pathname) && (
              <div className="hidden sm:block">
                {showPaywall ? (
                  <Button size="sm" className="rounded-full bg-neutral-900 text-white hover:bg-neutral-800">
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                    New campaign
                  </Button>
                ) : (
                  <Button asChild size="sm" className="rounded-full bg-neutral-900 text-white hover:bg-neutral-800">
                    <Link href="/campaigns/new">
                      <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                      New campaign
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 bg-neutral-50 p-6 sm:p-8">
          {children}
        </main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around border-t border-neutral-200 bg-white px-1 py-2 lg:hidden"
        aria-label="Primary"
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex flex-1 flex-col items-center gap-1 rounded-lg py-1 text-xs",
            pathname === "/dashboard" ? "text-blue-500" : "text-neutral-600",
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          Home
        </Link>
        <Link
          href="/dashboard/leads"
          className={cn(
            "flex flex-1 flex-col items-center gap-1 rounded-lg py-1 text-xs",
            pathname.startsWith("/dashboard/leads") || pathname.startsWith("/campaigns")
              ? "text-blue-500"
              : "text-neutral-600",
          )}
        >
          <SearchIcon className="h-5 w-5" />
          Leads
        </Link>
        <Link
          href="/dashboard/calls"
          className={cn(
            "flex flex-1 flex-col items-center gap-1 rounded-lg py-1 text-xs",
            pathname.startsWith("/dashboard/calls") ? "text-blue-500" : "text-neutral-600",
          )}
        >
          <Phone className="h-5 w-5" />
          Calls
        </Link>
        <Link
          href="/dashboard/websites"
          className={cn(
            "flex flex-1 flex-col items-center gap-1 rounded-lg py-1 text-xs",
            pathname.startsWith("/dashboard/websites") || pathname.startsWith("/studio")
              ? "text-blue-500"
              : "text-neutral-600",
          )}
        >
          <Globe className="h-5 w-5" />
          Sites
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 rounded-lg py-1 text-xs text-neutral-600"
        >
          <MoreHorizontal className="h-5 w-5" />
          More
        </button>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-2xl border border-neutral-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-neutral-900">Menu</span>
              <button type="button" className="rounded-full p-2 hover:bg-neutral-100" onClick={() => setMobileOpen(false)}>
                <Menu className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {DASHBOARD_NAV.filter((i) => !["/dashboard", "/dashboard/leads", "/dashboard/calls", "/dashboard/websites"].includes(i.href)).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-3 text-sm text-neutral-700 hover:bg-neutral-50"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/dashboard/settings"
                data-paywall-exempt
                className="rounded-lg px-3 py-3 text-sm text-neutral-700 hover:bg-neutral-50"
                onClick={() => setMobileOpen(false)}
              >
                Settings
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

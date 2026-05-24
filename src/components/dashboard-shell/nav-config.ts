import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Globe,
  LayoutDashboard,
  MessageSquare,
  Phone,
  Search,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Also treat these path prefixes as active (e.g. legacy campaign flows). */
  activePrefixes?: string[];
};

export const DASHBOARD_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/dashboard/leads",
    label: "Leads",
    icon: Search,
    activePrefixes: ["/dashboard/leads", "/campaigns"],
  },
  { href: "/dashboard/calls", label: "Calls", icon: Phone },
  { href: "/dashboard/scripts", label: "AI Scripts", icon: MessageSquare },
  {
    href: "/dashboard/websites",
    label: "Website Studio",
    icon: Globe,
    activePrefixes: ["/dashboard/websites", "/studio"],
  },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

const EXEMPT_PATH_PREFIXES = ["/dashboard/settings"];

function isExemptPath(pathname: string): boolean {
  return EXEMPT_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isExemptElement(el: Element): boolean {
  if (el.closest("[data-paywall-exempt]")) return true;
  if (el.closest("[data-paywall-modal]")) return true;
  const link = el.closest("a[href]");
  if (link) {
    const href = link.getAttribute("href") ?? "";
    if (href.startsWith("/dashboard/settings")) return true;
  }
  return false;
}

function isInteractiveTarget(el: Element): boolean {
  if (el.closest("[data-paywall-exempt]")) return false;
  return Boolean(
    el.closest(
      'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="menuitem"], label[for]',
    ),
  );
}

type PaywallInteractionGuardProps = {
  children: ReactNode;
  showPaywall: boolean;
  isLoading: boolean;
  paywallOpen: boolean;
  openPaywall: () => void;
};

export function PaywallInteractionGuard({
  children,
  showPaywall,
  isLoading,
  paywallOpen,
  openPaywall,
}: PaywallInteractionGuardProps) {
  const pathname = usePathname();
  const active = showPaywall && !isLoading && !isExemptPath(pathname);

  useEffect(() => {
    if (!active || paywallOpen) return;

    const handleCapture = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!isInteractiveTarget(target) || isExemptElement(target)) return;

      event.preventDefault();
      event.stopPropagation();
      openPaywall();
    };

    document.addEventListener("click", handleCapture, true);
    return () => document.removeEventListener("click", handleCapture, true);
  }, [active, paywallOpen, openPaywall]);

  return <>{children}</>;
}

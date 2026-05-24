"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Pricing", href: "#pricing" },
];

export function Navbar() {
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Blue → purple accent strip */}
      <div
        className="fixed inset-x-0 top-0 z-[60] h-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
        aria-hidden
      />

      <header className="pointer-events-none fixed inset-x-0 top-[3px] z-50 flex justify-center px-4 pt-5 sm:px-6 sm:pt-6 lg:px-8">
        <div
          className={cn(
            "pointer-events-auto relative flex h-[4.25rem] w-full max-w-7xl items-center rounded-full border border-neutral-200/90 bg-white px-4 shadow-[0_4px_24px_-6px_rgba(15,23,42,0.08),0_0_0_1px_rgba(15,23,42,0.04)] transition-shadow duration-300 sm:h-[4.75rem] sm:px-6 lg:px-8",
            scrolled && "shadow-[0_12px_40px_-10px_rgba(15,23,42,0.14),0_0_0_1px_rgba(15,23,42,0.05)]",
          )}
        >
          {/* Logo */}
          <Link
            href="/"
            className="relative z-10 shrink-0"
            onClick={() => setOpen(false)}
          >
            <BrandLogo
              size="lg"
              className="gap-3"
              nameClassName="text-lg font-bold tracking-tight sm:text-xl"
              iconClassName="h-10 w-10 sm:h-11 sm:w-11"
            />
          </Link>

          {/* Desktop nav — centered */}
          <nav
            className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block"
            aria-label="Main"
          >
            <ul className="flex items-center gap-8 xl:gap-10">
              {nav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-[15px] font-semibold tracking-tight text-neutral-600 transition-colors duration-200 hover:text-neutral-950"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Desktop actions */}
          <div className="relative z-10 ml-auto hidden items-center gap-2 sm:gap-3 lg:flex">
            <Link
              href="/login"
              className="rounded-full px-4 py-2.5 text-[15px] font-semibold tracking-tight text-neutral-600 transition-colors duration-200 hover:bg-neutral-50 hover:text-neutral-950"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center rounded-full bg-neutral-900 px-6 text-[15px] font-semibold tracking-tight text-white shadow-sm transition-all duration-200 hover:bg-neutral-800 hover:shadow-md active:scale-[0.98]"
            >
              Get started
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="relative z-10 ml-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200/90 bg-neutral-50 text-neutral-900 transition-colors duration-200 hover:bg-neutral-100 lg:hidden"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" strokeWidth={2} /> : <Menu className="h-5 w-5" strokeWidth={2} />}
          </button>
        </div>
      </header>

      {/* Mobile overlay + panel */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-neutral-900/20 backdrop-blur-[2px] transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
        <div
          className={cn(
            "absolute left-4 right-4 top-[calc(3px+1.25rem+4.25rem)] origin-top rounded-3xl border border-neutral-200/90 bg-white p-2 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18)] transition-[opacity,transform] duration-300 ease-out sm:left-6 sm:right-6",
            open ? "scale-100 opacity-100" : "pointer-events-none scale-[0.97] opacity-0",
          )}
        >
          <nav className="flex flex-col p-1">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-2xl px-4 py-3.5 text-[15px] font-semibold tracking-tight text-neutral-700 transition-colors duration-200 hover:bg-neutral-50 hover:text-neutral-950"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-1 flex flex-col gap-2 border-t border-neutral-100 p-2 pt-3">
            <Link
              href="/login"
              className="flex h-12 items-center justify-center rounded-2xl text-[15px] font-semibold text-neutral-700 transition-colors duration-200 hover:bg-neutral-50"
              onClick={() => setOpen(false)}
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="flex h-12 items-center justify-center rounded-full bg-neutral-900 text-[15px] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-neutral-800 active:scale-[0.98]"
              onClick={() => setOpen(false)}
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

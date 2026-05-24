import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingSection, LandingSectionPad } from "./landing-section";

const tiers = [
  {
    name: "Starter",
    price: "$29",
    period: "/mo",
    desc: "Solo operators getting serious about outbound.",
    features: ["500 lead credits / mo", "AI scripts & previews", "Call logging", "Pipeline dashboard"],
    cta: "Start Starter",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$79",
    period: "/mo",
    desc: "Growing freelancers and small agencies.",
    features: [
      "Unlimited lead searches",
      "Advanced AI studio",
      "Shared workspace",
      "Pipeline analytics",
      "Priority support",
    ],
    cta: "Start Pro",
    href: "/signup",
    highlight: true,
  },
  {
    name: "Agency",
    price: "$199",
    period: "/mo",
    desc: "Teams dialing at volume with multiple seats.",
    features: ["Everything in Pro", "5 seats included", "Custom domains", "Audit log & roles", "Dedicated success"],
    cta: "Talk to sales",
    href: "/signup",
    highlight: false,
  },
];

export function Pricing() {
  return (
    <LandingSection id="pricing" className="border-t border-border/60 bg-secondary/20">
      <LandingSectionPad>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Simple pricing</h2>
          <p className="mt-4 text-muted-foreground sm:text-lg">
            Start small, upgrade when your pipeline gets noisy. No hidden seat math on Starter.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3 lg:items-stretch">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={
                t.highlight
                  ? "relative flex flex-col rounded-3xl border-2 border-primary bg-card p-6 shadow-2xl shadow-primary/15 sm:p-8"
                  : "flex flex-col rounded-3xl border border-border bg-card p-6 shadow-lg shadow-neutral-200/60 sm:p-8"
              }
            >
              {t.highlight ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white shadow-md">
                  Most Popular
                </span>
              ) : null}
              <h3 className="text-lg font-semibold text-foreground">{t.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-foreground">{t.price}</span>
                <span className="text-sm text-muted-foreground">{t.period}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-muted-foreground">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {t.highlight ? (
                <Button
                  asChild
                  className="mt-8 h-11 w-full rounded-2xl bg-primary font-semibold text-white shadow-lg shadow-primary/30 hover:bg-primary/90"
                >
                  <Link href={t.href}>{t.cta}</Link>
                </Button>
              ) : (
                <Button
                  asChild
                  variant="outline"
                  className="mt-8 h-11 w-full rounded-2xl border-border !bg-transparent font-semibold text-foreground hover:bg-secondary/40"
                >
                  <Link href={t.href}>{t.cta}</Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      </LandingSectionPad>
    </LandingSection>
  );
}

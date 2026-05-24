import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LandingSection, LandingSectionPad } from "./landing-section";

export function CTA() {
  return (
    <LandingSection className="overflow-hidden">
      <LandingSectionPad className="pb-24 sm:pb-32">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-primary/25 to-transparent blur-3xl" />
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-primary/10 via-card to-sky-50 p-px shadow-xl shadow-neutral-200/80">
          <div className="rounded-[calc(2rem-1px)] bg-card px-6 py-12 text-center sm:px-12 sm:py-16">
            <h2 className="mx-auto max-w-3xl text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Stop guessing who needs a website. Start calling the right businesses.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground sm:text-lg">
              Join designers and agencies using LeadForge to turn “no website found” into booked meetings every week.
            </p>
            <Button
              asChild
              className="mt-8 h-12 rounded-2xl bg-primary px-10 text-base font-semibold text-white shadow-xl shadow-primary/25 hover:bg-primary/90"
            >
              <Link href="/signup">Start Finding Leads</Link>
            </Button>
          </div>
        </div>
      </LandingSectionPad>
    </LandingSection>
  );
}

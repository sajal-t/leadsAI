import Link from "next/link";
import { MapPin, Phone, Star, Globe2, Mic2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingSection, LandingSectionPad } from "./landing-section";

export function Hero() {
  return (
    <LandingSection className="overflow-hidden pt-32 sm:pt-36 lg:pt-40">
      <LandingSectionPad className="relative pb-12 sm:pb-16">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="pointer-events-none absolute top-20 right-0 h-72 w-72 rounded-full bg-sky-400/10 blur-[100px]" />
        <div className="pointer-events-none absolute top-40 left-0 h-64 w-64 rounded-full bg-blue-500/10 blur-[90px]" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-border bg-secondary/30 px-4 py-1.5 text-xs font-medium text-muted-foreground sm:text-sm">
            Built for web designers, freelancers, and local agency owners
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.08]">
            Find local businesses without websites.{" "}
            <span className="text-primary">Turn them into clients with AI.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            LeadForge surfaces “No website found” businesses near you, writes personalized cold-call scripts,
            generates instant website previews, and keeps calls, follow-ups, and deals organized in one workspace.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Button
              asChild
              className="h-12 w-full rounded-2xl bg-primary px-8 text-base font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 sm:w-auto"
            >
              <Link href="/signup">Start Finding Leads</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 w-full rounded-2xl border-border bg-card/40 px-8 text-base font-medium text-foreground backdrop-blur-sm hover:bg-secondary/40 sm:w-auto"
            >
              <Link href="#dashboard">Watch Demo</Link>
            </Button>
          </div>
        </div>

        <div className="relative mx-auto mt-16 max-w-6xl sm:mt-20">
          <div className="rounded-3xl border border-border bg-card p-2 shadow-2xl shadow-neutral-200/80">
            <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-secondary/20 px-3 py-2.5 sm:px-4">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-400/90" />
                <span className="h-3 w-3 rounded-full bg-amber-400/90" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/90" />
              </div>
              <div className="ml-2 flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground sm:text-sm">
                <Globe2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate font-mono text-[11px] sm:text-sm">app.leadforge.io/dashboard</span>
              </div>
            </div>
            <div className="mt-2 grid gap-3 rounded-2xl border border-border/60 bg-background/40 p-3 sm:grid-cols-3 sm:p-4">
              <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-inner">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">Lead Finder</p>
                  <span className="rounded-lg bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">Live</span>
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  Dentists in Bothell, WA
                </p>
                <ul className="mt-4 space-y-3">
                  {[
                    { name: "North Creek Dental", rating: 4.8, phone: "(425) 555-0142", web: false },
                    { name: "Evergreen Smile Studio", rating: 4.6, phone: "(425) 555-0198", web: false },
                    { name: "Cascade Family Dentistry", rating: 4.9, phone: "(425) 555-0161", web: true },
                  ].map((b) => (
                    <li
                      key={b.name}
                      className="rounded-xl border border-border/80 bg-secondary/20 p-3 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{b.name}</p>
                        <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-amber-600">
                          <Star className="h-3 w-3 fill-current" />
                          {b.rating}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {b.phone}
                      </p>
                      <p
                        className={
                          b.web
                            ? "mt-2 text-[10px] font-medium text-emerald-600"
                            : "mt-2 text-[10px] font-semibold text-primary"
                        }
                      >
                        {b.web ? "Website detected" : "No website found"}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-inner">
                <div className="flex items-center gap-2">
                  <Mic2 className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">AI Cold-Call Script</p>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  “Hi, this is Alex from a local web studio. I noticed North Creek Dental doesn’t have a site yet —
                  we help practices like yours get found on Google with a fast, mobile-first site. Do you have 60
                  seconds for me to share what we’d build?”
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {["Personalized opener", "Value prop", "Objection buffer"].map((t) => (
                    <span
                      key={t}
                      className="rounded-lg border border-border bg-secondary/30 px-2 py-1 text-[10px] font-medium text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-inner">
                  <p className="text-sm font-semibold text-foreground">Website Preview</p>
                  <div className="mt-3 aspect-video rounded-xl border border-dashed border-primary/40 bg-gradient-to-br from-primary/10 to-fuchsia-500/5" />
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Preview Generated ✓
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-inner">
                  <p className="text-sm font-semibold text-foreground">Call outcome</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-primary/20 px-3 py-1 text-[11px] font-semibold text-primary">
                      Interested
                    </span>
                    <span className="rounded-full border border-border bg-secondary/30 px-3 py-1 text-[11px] font-medium text-foreground">
                      Meeting Booked
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </LandingSectionPad>
    </LandingSection>
  );
}

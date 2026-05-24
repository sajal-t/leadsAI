import {
  MapPinned,
  Mic2,
  Headphones,
  Palette,
  TrendingUp,
  LayoutDashboard,
} from "lucide-react";
import { LandingSection, LandingSectionPad } from "./landing-section";

const items = [
  {
    icon: MapPinned,
    title: "Lead Finder",
    body: "Search by niche and city, surface businesses missing a site, and export a focused call list in minutes.",
  },
  {
    icon: Mic2,
    title: "AI Cold-Call Scripts",
    body: "Personalized openers, value props, and objection buffers generated from each lead’s context.",
  },
  {
    icon: Headphones,
    title: "Guided Call Logger",
    body: "Log outcomes, next steps, and notes in one flow so nothing gets lost between calls.",
  },
  {
    icon: Palette,
    title: "AI Website Studio",
    body: "Spin up branded preview pages you can show on the phone — proof you can ship, not just pitch.",
  },
  {
    icon: TrendingUp,
    title: "Pipeline Analytics",
    body: "Track answer rates, interest, meetings, and previews so you know what’s working each week.",
  },
  {
    icon: LayoutDashboard,
    title: "Sales Dashboard",
    body: "Answer rate, interest, meetings, previews, and pipeline metrics in a single glance.",
  },
];

export function Features() {
  return (
    <LandingSection id="features">
      <LandingSectionPad>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Everything you need to sell local sites</h2>
          <p className="mt-4 text-muted-foreground sm:text-lg">
            One AI-powered workspace from discovery to closed deal — built for how agencies and freelancers actually work.
          </p>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {items.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-3xl border border-border bg-card p-6 shadow-md shadow-neutral-200/60"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/40 text-primary ring-1 ring-border">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </LandingSectionPad>
    </LandingSection>
  );
}

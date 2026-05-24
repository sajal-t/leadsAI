import { Search, PhoneOff, Inbox, LineChart } from "lucide-react";
import { LandingSection, LandingSectionPad } from "./landing-section";

const items = [
  {
    icon: Search,
    title: "Manual lead research",
    body: "Hours on Google Maps and Yelp guessing who still needs a real website — and still missing obvious prospects.",
  },
  {
    icon: PhoneOff,
    title: "Generic cold calls",
    body: "Calling without context sounds like spam. Without a tight opener and offer, you burn through lists fast.",
  },
  {
    icon: Inbox,
    title: "Lost follow-ups",
    body: "Sticky notes and spreadsheets don’t scale. Promised callbacks slip through the cracks after busy call days.",
  },
  {
    icon: LineChart,
    title: "Hard to track pipeline",
    body: "No single view of who was interested, who booked, or which previews actually moved the deal forward.",
  },
];

export function Problem() {
  return (
    <LandingSection className="border-t border-border/60 bg-secondary/20">
      <LandingSectionPad>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Selling websites shouldn’t feel chaotic</h2>
          <p className="mt-4 text-muted-foreground sm:text-lg">
            Most designers know how to build — not how to systematically find, call, and close local businesses at scale.
          </p>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {items.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-3xl border border-border bg-card p-6 shadow-md shadow-neutral-200/60 transition-colors hover:border-neutral-300 hover:shadow-lg"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </LandingSectionPad>
    </LandingSection>
  );
}

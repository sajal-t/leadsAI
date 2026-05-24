import { LandingSection, LandingSectionPad } from "./landing-section";

const steps = [
  {
    title: "Define your hunt",
    body: "Pick a niche and geography. LeadForge finds local businesses that still need a real website.",
  },
  {
    title: "Review prioritized leads",
    body: "See ratings, phone numbers, and a clear “No website found” signal so you know who to call first.",
  },
  {
    title: "Generate scripts & previews",
    body: "One click creates a tailored cold-call script and a lightweight preview page you can walk through live.",
  },
  {
    title: "Log calls & outcomes",
    body: "Track interested owners, objections, and booked meetings without juggling spreadsheets.",
  },
  {
    title: "Follow up & close",
    body: "Mark deals won, track revenue metrics, and see pipeline movement from first dial to closed project.",
  },
];

export function HowItWorks() {
  return (
    <LandingSection id="how-it-works" className="border-t border-border/60 bg-secondary/15">
      <LandingSectionPad>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">How it works</h2>
          <p className="mt-4 text-muted-foreground sm:text-lg">
            A simple five-step loop from raw territory to booked meetings — repeatable every week.
          </p>
        </div>
        <div className="mx-auto mt-14 max-w-3xl">
          <ol className="relative space-y-0">
            {steps.map((step, i) => (
              <li key={step.title} className="relative flex gap-5 pb-12 last:pb-0 sm:gap-8">
                {i < steps.length - 1 ? (
                  <div
                    className="absolute left-[22px] top-12 hidden h-[calc(100%-2rem)] w-px bg-gradient-to-b from-primary/60 via-border to-transparent sm:block"
                    aria-hidden
                  />
                ) : null}
                <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/25 sm:h-12 sm:w-12 sm:rounded-3xl sm:text-base">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1 rounded-3xl border border-border bg-card p-5 shadow-md shadow-neutral-200/50 sm:p-6">
                  <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </LandingSectionPad>
    </LandingSection>
  );
}

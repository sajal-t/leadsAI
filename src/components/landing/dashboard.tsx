import { LandingSection, LandingSectionPad } from "./landing-section";

const metrics = [
  { label: "Total Leads", value: "1,248" },
  { label: "Calls Made", value: "312" },
  { label: "Answer Rate", value: "34%" },
  { label: "Interested Leads", value: "58" },
  { label: "Meetings Booked", value: "21" },
  { label: "Previews Generated", value: "47" },
  { label: "Deals Closed", value: "12" },
  { label: "MRR", value: "$12.4k" },
  { label: "ARR", value: "$148k" },
];

const week = [
  { label: "Mon", h: "h-[42%]" },
  { label: "Tue", h: "h-[68%]" },
  { label: "Wed", h: "h-[48%]" },
  { label: "Thu", h: "h-[82%]" },
  { label: "Fri", h: "h-[56%]" },
  { label: "Sat", h: "h-[28%]" },
  { label: "Sun", h: "h-[34%]" },
];

export function Dashboard() {
  return (
    <LandingSection id="dashboard" className="border-t border-border/60 bg-secondary/15">
      <LandingSectionPad>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Pipeline dashboard</h2>
          <p className="mt-4 text-muted-foreground sm:text-lg">
            See how outreach is performing at a glance — from first dial to revenue impact.
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-6xl rounded-3xl border border-border bg-card p-5 shadow-xl shadow-neutral-200/70 sm:p-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-2xl border border-border bg-secondary/25 px-4 py-4 sm:px-5 sm:py-5"
              >
                <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{m.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-background/40 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Weekly activity</p>
              <span className="text-xs text-muted-foreground">Last 7 days</span>
            </div>
            <div className="mt-8 flex h-44 items-end justify-between gap-2 sm:h-52 sm:gap-3">
              {week.map((d) => (
                <div key={d.label} className="flex h-full min-h-0 flex-1 flex-col items-center justify-end gap-2">
                  <div className="flex h-[calc(100%-1.5rem)] w-full max-w-[52px] items-end justify-center">
                    <div
                      className={`w-full rounded-t-xl bg-gradient-to-t from-primary/50 to-primary/90 shadow-sm shadow-primary/20 ${d.h}`}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground sm:text-xs">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </LandingSectionPad>
    </LandingSection>
  );
}

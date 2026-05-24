import { Sparkles, Monitor, Code2 } from "lucide-react";
import { LandingSection, LandingSectionPad } from "./landing-section";

export function AIStudio() {
  return (
    <LandingSection className="overflow-hidden">
      <LandingSectionPad>
        <div className="pointer-events-none absolute left-1/2 h-64 w-[min(100%,720px)] -translate-x-1/2 rounded-full bg-primary/20 blur-[100px]" />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">AI Website Studio</h2>
          <p className="mt-4 text-muted-foreground sm:text-lg">
            Prompt a preview, iterate in the editor, and show prospects a concrete version of their future site — while you are still on the line.
          </p>
        </div>

        <div className="relative mx-auto mt-14 max-w-6xl">
          <div className="grid gap-4 rounded-3xl border border-border bg-card p-3 shadow-xl shadow-neutral-200/70 lg:grid-cols-3 lg:p-4">
            <div className="flex flex-col rounded-2xl border border-border bg-background/50 p-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">AI Prompt</span>
              </div>
              <div className="mt-3 space-y-2 rounded-xl bg-secondary/30 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                <p className="text-primary/90">&gt; Build a one-page site for a family dentist in Bothell.</p>
                <p>— Trust-focused hero, services grid, Google Maps block, soft blue &amp; white palette, large contact CTA.</p>
                <p className="text-muted-foreground/80">— Mobile-first, fast load, accessible headings.</p>
              </div>
              <div className="mt-auto pt-4">
                <div className="h-9 rounded-xl border border-dashed border-border/80 bg-card/50" />
              </div>
            </div>

            <div className="flex flex-col rounded-2xl border border-border bg-background/50 p-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Monitor className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Live Preview</span>
              </div>
              <div className="mt-3 flex min-h-[220px] flex-col rounded-xl border border-border/80 bg-gradient-to-b from-secondary/40 to-card/80 p-4">
                <div className="h-8 rounded-lg bg-primary/20" />
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="h-16 rounded-lg bg-secondary/50" />
                  <div className="h-16 rounded-lg bg-secondary/50" />
                  <div className="h-16 rounded-lg bg-secondary/50" />
                </div>
                <div className="mt-4 h-24 rounded-lg bg-secondary/30" />
                <div className="mt-3 h-10 w-32 rounded-full bg-primary/40" />
              </div>
            </div>

            <div className="flex flex-col rounded-2xl border border-border bg-background/50 p-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Code2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Code</span>
              </div>
              <pre className="mt-3 max-h-[280px] overflow-hidden rounded-xl border border-border bg-neutral-100 p-3 text-left font-mono text-[10px] leading-relaxed text-emerald-800 sm:text-[11px]">
                {`<section className="hero">\n  <h1>North Creek Dental</h1>\n  <p>Family dentistry in Bothell.</p>\n  <Button>Book a visit</Button>\n</section>`}
              </pre>
            </div>
          </div>
        </div>
      </LandingSectionPad>
    </LandingSection>
  );
}

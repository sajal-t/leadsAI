import { User, Building2, Phone, Globe, GraduationCap, Package } from "lucide-react";
import { LandingSection, LandingSectionPad } from "./landing-section";

const cases = [
  {
    icon: User,
    title: "Freelancers",
    body: "Run a repeatable weekly prospecting block without hiring an SDR.",
  },
  {
    icon: Building2,
    title: "Agencies",
    body: "Give every rep the same playbook: leads, scripts, previews, and logging.",
  },
  {
    icon: Phone,
    title: "Cold-calling teams",
    body: "Arm dialers with context-rich lists and scripts that don’t sound robotic.",
  },
  {
    icon: Globe,
    title: "Local SEO shops",
    body: "Find businesses that need both visibility and a proper site to convert traffic.",
  },
  {
    icon: GraduationCap,
    title: "Students",
    body: "Practice real outbound workflows while building a portfolio of live previews.",
  },
  {
    icon: Package,
    title: "White-label sellers",
    body: "Ship faster pitches with AI-generated previews you can rebrand per vertical.",
  },
];

export function UseCases() {
  return (
    <LandingSection>
      <LandingSectionPad>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Built for every kind of seller</h2>
          <p className="mt-4 text-muted-foreground sm:text-lg">
            Whether you are solo or scaling a bench, LeadForge adapts to how you sell websites today.
          </p>
        </div>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-md shadow-neutral-200/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </LandingSectionPad>
    </LandingSection>
  );
}

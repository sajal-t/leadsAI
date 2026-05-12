import type { ReactNode } from "react";
import { coldCallScriptSchema, type ColdCallScriptJson } from "@/lib/cold-call-script-schema";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type Props = { scriptJson: unknown };

function safeParse(json: unknown): ColdCallScriptJson | null {
  const r = coldCallScriptSchema.safeParse(json);
  return r.success ? r.data : null;
}

function humanizeObjectionKey(key: string): string {
  return key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const NAV = [
  { href: "#script-default-path", label: "Default path" },
  { href: "#script-alt-opens", label: "Alt opens" },
  { href: "#script-owner", label: "Owner" },
  { href: "#script-gatekeeper", label: "Gatekeeper" },
  { href: "#script-qualify", label: "Qualify" },
  { href: "#script-objections", label: "Objections" },
  { href: "#script-voicemail", label: "Voicemail & text" },
  { href: "#script-notes", label: "Your notes" },
] as const;

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
    >
      {label}
    </a>
  );
}

function ScriptBlock({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-zinc-100 bg-zinc-50/80 p-4", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{title}</p>
      <p className="mt-2 text-[15px] leading-relaxed text-zinc-900">{children}</p>
    </div>
  );
}

function StepCard({ step, title, body }: { step: number; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-900">
        {step}
      </span>
      <div className="min-w-0 flex-1 rounded-lg border border-zinc-100 bg-white p-3 shadow-sm">
        <p className="text-xs font-medium text-zinc-500">{title}</p>
        <p className="mt-1 text-[15px] leading-relaxed text-zinc-900">{body}</p>
      </div>
    </div>
  );
}

export function ColdCallScriptCards({ scriptJson }: Props) {
  const s = safeParse(scriptJson);
  if (!s) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Script data could not be read in the expected format. Try generating the script again.
      </p>
    );
  }

  const objections = Object.entries(s.objection_handlers);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="sticky top-0 z-20 -mx-1 mb-6 border-b border-zinc-200/80 bg-zinc-50/90 px-1 py-3 backdrop-blur-md sm:rounded-lg sm:border sm:border-zinc-200 sm:bg-white/90 sm:px-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Jump to</p>
        <div className="flex flex-wrap gap-2">{NAV.map((n) => (
          <NavLink key={n.href} href={n.href} label={n.label} />
        ))}</div>
      </div>

      <header className="mb-8 space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">{s.script_name}</h2>
        <p className="text-sm leading-relaxed text-zinc-600">{s.strategy}</p>
        <div className="inline-flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900 ring-1 ring-emerald-100">
            Call goal
          </span>
          <span className="text-sm text-zinc-800">{s.call_goal}</span>
        </div>
      </header>

      <section id="script-default-path" className="scroll-mt-28 space-y-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900">Default call path</h3>
          <span className="text-xs text-zinc-500">Say this in order</span>
        </div>
        <Card className="border-sky-100 bg-gradient-to-b from-sky-50/40 to-white shadow-sm">
          <CardContent className="space-y-3 p-4 sm:p-5">
            <ScriptBlock title="Opener">{s.opener}</ScriptBlock>
            <ScriptBlock title="Why you’re calling">{s.reason_for_call}</ScriptBlock>
            <ScriptBlock title="Short pitch (~30s)">{s.thirty_second_pitch}</ScriptBlock>
            <ScriptBlock title="Main question">{s.main_question}</ScriptBlock>
            <ScriptBlock title="Preview / next step">{s.website_preview_pitch}</ScriptBlock>
          </CardContent>
        </Card>
      </section>

      <section id="script-alt-opens" className="scroll-mt-28 mt-10">
        <details className="group rounded-xl border border-zinc-200 bg-white shadow-sm open:shadow-md">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-zinc-900 marker:hidden [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              Alternate openers
              <span className="text-xs font-normal text-zinc-500 group-open:hidden">Tap to expand</span>
              <span className="hidden text-xs font-normal text-zinc-500 group-open:inline">Tap to collapse</span>
            </span>
          </summary>
          <div className="space-y-3 border-t border-zinc-100 px-4 pb-4 pt-3">
            <ScriptBlock title="Permission-based">{s.permission_based_opener}</ScriptBlock>
            <ScriptBlock title="More direct">{s.non_permission_opener}</ScriptBlock>
          </div>
        </details>
      </section>

      <section id="script-owner" className="scroll-mt-28 mt-10 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-900">If the owner answers</h3>
        <div className="space-y-3">
          <StepCard step={1} title="Open" body={s.if_owner_answers.step_1_open} />
          <StepCard step={2} title="Reason" body={s.if_owner_answers.step_2_reason} />
          <StepCard step={3} title="Pitch" body={s.if_owner_answers.step_3_pitch} />
          <StepCard step={4} title="Question" body={s.if_owner_answers.step_4_question} />
          <StepCard step={5} title="Close / CTA" body={s.if_owner_answers.step_5_cta} />
        </div>
      </section>

      <section id="script-gatekeeper" className="scroll-mt-28 mt-10 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-900">If staff answers</h3>
        <div className="space-y-3">
          <StepCard step={1} title="Open" body={s.if_gatekeeper_answers.step_1_open} />
          <StepCard step={2} title="Ask for owner" body={s.if_gatekeeper_answers.step_2_ask_for_owner} />
          <StepCard step={3} title="If they ask why" body={s.if_gatekeeper_answers.step_3_if_they_ask_why} />
          <StepCard step={4} title="If owner unavailable" body={s.if_gatekeeper_answers.step_4_if_owner_unavailable} />
        </div>
      </section>

      <section id="script-qualify" className="scroll-mt-28 mt-10 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-900">If they’re interested — qualify</h3>
        <ol className="list-none space-y-2">
          {s.qualification_questions.map((q, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-lg border border-zinc-100 bg-white p-3 text-[15px] leading-relaxed text-zinc-800 shadow-sm"
            >
              <span className="font-mono text-xs font-semibold text-zinc-400 tabular-nums">{i + 1}.</span>
              <span>{q}</span>
            </li>
          ))}
        </ol>
      </section>

      <section id="script-objections" className="scroll-mt-28 mt-10 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-900">Objections</h3>
        <p className="text-xs text-zinc-500">Expand one at a time while you’re on the call.</p>
        <div className="space-y-2">
          {objections.map(([key, text]) => (
            <details key={key} className="group rounded-lg border border-zinc-200 bg-white open:ring-1 open:ring-zinc-200">
              <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-zinc-900 marker:hidden list-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  {humanizeObjectionKey(key)}
                  <span className="text-zinc-400 transition group-open:rotate-90">›</span>
                </span>
              </summary>
              <p className="border-t border-zinc-100 px-3 py-3 text-[15px] leading-relaxed text-zinc-800">{text}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="script-voicemail" className="scroll-mt-28 mt-10 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-zinc-900">Voicemail</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-zinc-800">{s.voicemail_script}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-zinc-900">Text follow-up</h3>
            <p className="mt-1 text-xs text-zinc-500">Only if texting this number is appropriate and allowed.</p>
            <p className="mt-2 text-[15px] leading-relaxed text-zinc-800">{s.quick_follow_up_text}</p>
          </CardContent>
        </Card>
      </section>

      <section id="script-notes" className="scroll-mt-28 mt-10 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-900">Notes for you</h3>
        <ul className="space-y-2">
          {s.notes_to_caller.map((note, i) => (
            <li
              key={i}
              className="flex gap-2 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-sm leading-relaxed text-amber-950"
            >
              <span className="select-none text-amber-600">✓</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

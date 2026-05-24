import { scriptJsonToView } from "@/lib/cold-call-script-schema";
import { cn } from "@/lib/utils";

type Props = { scriptJson: unknown };

function Line({ n, label, text, highlight }: { n: number; label: string; text: string; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 sm:p-5",
        highlight ? "border-blue-200 bg-gradient-to-b from-blue-50/60 to-white shadow-sm" : "border-neutral-200 bg-white",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
            highlight ? "bg-blue-600 text-white" : "bg-neutral-100 text-neutral-600",
          )}
        >
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
          <p className="mt-2 text-base leading-relaxed text-neutral-900 sm:text-lg">{text}</p>
        </div>
      </div>
    </div>
  );
}

export function ColdCallScriptCards({ scriptJson }: Props) {
  const s = scriptJsonToView(scriptJson);
  if (!s) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Script data could not be read. Generate a new script.
      </p>
    );
  }

  const mainLines = [
    { label: "Opener", text: s.opener },
    { label: "Why you're calling", text: s.reason },
    { label: "Pitch", text: s.pitch },
    { label: "Ask", text: s.ask },
    ...(s.previewLine ? [{ label: "Preview / next step", text: s.previewLine }] : []),
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900">{s.title}</h2>
        <p className="text-sm text-neutral-600">
          <span className="font-medium text-neutral-800">Goal:</span> {s.goal}
        </p>
      </header>

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Say this in order</p>
        {mainLines.map((line, i) => (
          <Line key={line.label} n={i + 1} label={line.label} text={line.text} highlight={i === 0} />
        ))}
      </section>

      {s.gatekeeper ? (
        <details className="rounded-xl border border-neutral-200 bg-white open:shadow-sm">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-neutral-900 marker:hidden [&::-webkit-details-marker]:hidden">
            If someone else answers
          </summary>
          <p className="border-t border-neutral-100 px-4 pb-4 pt-2 text-[15px] leading-relaxed text-neutral-800">
            {s.gatekeeper}
          </p>
        </details>
      ) : null}

      {s.objections.length > 0 ? (
        <details className="rounded-xl border border-neutral-200 bg-white open:shadow-sm">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-neutral-900 marker:hidden [&::-webkit-details-marker]:hidden">
            Objections ({s.objections.length})
          </summary>
          <div className="space-y-2 border-t border-neutral-100 px-4 pb-4 pt-2">
            {s.objections.map((o) => (
              <details key={o.key} className="rounded-lg border border-neutral-100 bg-neutral-50/80 open:bg-white">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-neutral-800 marker:hidden list-none [&::-webkit-details-marker]:hidden">
                  {o.label}
                </summary>
                <p className="border-t border-neutral-100 px-3 py-2 text-sm leading-relaxed text-neutral-700">{o.reply}</p>
              </details>
            ))}
          </div>
        </details>
      ) : null}

      {s.voicemail ? (
        <details className="rounded-xl border border-neutral-200 bg-white">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-neutral-900 marker:hidden [&::-webkit-details-marker]:hidden">
            Voicemail
          </summary>
          <p className="border-t border-neutral-100 px-4 pb-4 pt-2 text-[15px] leading-relaxed text-neutral-800">
            {s.voicemail}
          </p>
        </details>
      ) : null}

      {s.notes.length > 0 ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-900/80">Quick tips</p>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-amber-950">
            {s.notes.map((note, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-600">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  no_answer: "No Answer",
  voicemail: "Voicemail",
  interested: "Interested",
  callback: "Callback",
  not_interested: "Not Interested",
  meeting_booked: "Meeting",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export function CallOutcomeBadge({ outcome }: { outcome: string }) {
  const label = map[outcome] ?? outcome.replace(/_/g, " ");
  const cls =
    outcome === "interested" || outcome === "meeting_booked"
      ? "bg-blue-100 text-blue-700"
      : outcome === "no_answer" || outcome === "voicemail"
        ? "bg-neutral-100 text-neutral-600"
        : outcome === "callback"
          ? "bg-yellow-100 text-yellow-700"
          : outcome === "not_interested" || outcome === "closed_lost"
            ? "bg-red-100 text-red-700"
            : outcome === "closed_won"
              ? "bg-green-100 text-green-700"
              : "bg-green-100 text-green-700";
  return <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-medium", cls)}>{label}</span>;
}

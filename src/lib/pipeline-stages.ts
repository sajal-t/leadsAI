/** Kanban column ids (UI) → values persisted on `deals.stage`. */
export const PIPELINE_COLUMNS = [
  { id: "new_leads", title: "New Leads", headerClass: "bg-neutral-200 text-neutral-900", dbStage: "lead" },
  { id: "contacted", title: "Contacted", headerClass: "bg-blue-200 text-neutral-900", dbStage: "contacted" },
  { id: "interested", title: "Interested", headerClass: "bg-yellow-200 text-neutral-900", dbStage: "interested" },
  { id: "proposal_sent", title: "Proposal Sent", headerClass: "bg-purple-200 text-neutral-900", dbStage: "proposal_sent" },
  { id: "closed_won", title: "Closed Won", headerClass: "bg-green-200 text-neutral-900", dbStage: "closed_won" },
  { id: "closed_lost", title: "Closed Lost", headerClass: "bg-red-200 text-neutral-900", dbStage: "closed_lost" },
] as const;

export type PipelineColumnId = (typeof PIPELINE_COLUMNS)[number]["id"];

export function dbStageToColumnId(stage: string | null | undefined): PipelineColumnId {
  const s = (stage ?? "lead").toLowerCase();
  if (s === "lead" || s === "new_leads") return "new_leads";
  const hit = PIPELINE_COLUMNS.find((c) => c.dbStage === s);
  return hit?.id ?? "new_leads";
}

export function columnIdToDbStage(columnId: string): string {
  const hit = PIPELINE_COLUMNS.find((c) => c.id === columnId);
  return hit?.dbStage ?? "lead";
}

import { z } from "zod";

/** Compact script shape — optimized for reading aloud on a live call. */
export const coldCallScriptSchema = z.object({
  script_name: z.string(),
  call_goal: z.string(),
  opener: z.string(),
  reason: z.string(),
  pitch: z.string(),
  ask: z.string(),
  preview_line: z.string().optional(),
  gatekeeper: z.string(),
  objections: z.object({
    not_interested: z.string(),
    already_have_someone: z.string(),
    no_budget: z.string(),
    send_info: z.string(),
    call_back: z.string(),
  }),
  voicemail: z.string(),
  notes: z.array(z.string()).min(2).max(4),
});

export type ColdCallScriptJson = z.infer<typeof coldCallScriptSchema>;

export function parseColdCallScript(data: unknown): ColdCallScriptJson {
  return coldCallScriptSchema.parse(data);
}

/** UI-friendly view — supports new scripts and older stored JSON. */
export type ScriptView = {
  title: string;
  goal: string;
  opener: string;
  reason: string;
  pitch: string;
  ask: string;
  previewLine: string | null;
  gatekeeper: string;
  objections: { key: string; label: string; reply: string }[];
  voicemail: string;
  notes: string[];
};

const OBJECTION_LABELS: Record<string, string> = {
  not_interested: "Not interested",
  already_have_someone: "Already have someone",
  no_budget: "Too expensive / no budget",
  send_info: "Send me info",
  call_back: "Call back later",
  we_already_have_someone: "Already have someone",
  too_expensive: "Too expensive",
  send_me_an_email: "Send me info",
  we_do_not_need_a_website: "Don't need a website",
  call_back_later: "Call back later",
  how_did_you_get_this_number: "How did you get my number?",
  is_this_a_sales_call: "Is this a sales call?",
};

function mapV2(s: ColdCallScriptJson): ScriptView {
  return {
    title: s.script_name,
    goal: s.call_goal,
    opener: s.opener,
    reason: s.reason,
    pitch: s.pitch,
    ask: s.ask,
    previewLine: s.preview_line?.trim() || null,
    gatekeeper: s.gatekeeper,
    objections: Object.entries(s.objections).map(([key, reply]) => ({
      key,
      label: OBJECTION_LABELS[key] ?? key.replaceAll("_", " "),
      reply,
    })),
    voicemail: s.voicemail,
    notes: s.notes,
  };
}

type LegacyScript = {
  script_name?: string;
  strategy?: string;
  call_goal?: string;
  opener?: string;
  reason_for_call?: string;
  thirty_second_pitch?: string;
  main_question?: string;
  website_preview_pitch?: string;
  if_gatekeeper_answers?: {
    step_1_open?: string;
    step_2_ask_for_owner?: string;
    step_3_if_they_ask_why?: string;
    step_4_if_owner_unavailable?: string;
  };
  objection_handlers?: Record<string, string>;
  voicemail_script?: string;
  notes_to_caller?: string[];
};

function mapLegacy(s: LegacyScript): ScriptView {
  const gk = s.if_gatekeeper_answers;
  const gatekeeper = gk
    ? [gk.step_1_open, gk.step_2_ask_for_owner, gk.step_3_if_they_ask_why, gk.step_4_if_owner_unavailable]
        .filter(Boolean)
        .join(" ")
    : "Ask for the owner. Say you have a quick question about how they show up online—nothing urgent.";

  const objections = Object.entries(s.objection_handlers ?? {}).map(([key, reply]) => ({
    key,
    label: OBJECTION_LABELS[key] ?? key.replaceAll("_", " "),
    reply,
  }));

  return {
    title: s.script_name ?? "Call script",
    goal: s.call_goal ?? s.strategy ?? "Get permission for a quick follow-up.",
    opener: s.opener ?? "",
    reason: s.reason_for_call ?? "",
    pitch: s.thirty_second_pitch ?? "",
    ask: s.main_question ?? "",
    previewLine: s.website_preview_pitch?.trim() || null,
    gatekeeper,
    objections,
    voicemail: s.voicemail_script ?? "",
    notes: s.notes_to_caller ?? [],
  };
}

export function scriptJsonToView(json: unknown): ScriptView | null {
  const v2 = coldCallScriptSchema.safeParse(json);
  if (v2.success) return mapV2(v2.data);

  if (json && typeof json === "object" && "thirty_second_pitch" in json) {
    return mapLegacy(json as LegacyScript);
  }

  return null;
}

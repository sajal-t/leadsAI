import { z } from "zod";

const ownerFlow = z.object({
  step_1_open: z.string(),
  step_2_reason: z.string(),
  step_3_pitch: z.string(),
  step_4_question: z.string(),
  step_5_cta: z.string(),
});

const gatekeeperFlow = z.object({
  step_1_open: z.string(),
  step_2_ask_for_owner: z.string(),
  step_3_if_they_ask_why: z.string(),
  step_4_if_owner_unavailable: z.string(),
});

const objectionHandlers = z.object({
  not_interested: z.string(),
  we_already_have_someone: z.string(),
  too_expensive: z.string(),
  send_me_an_email: z.string(),
  we_do_not_need_a_website: z.string(),
  call_back_later: z.string(),
  how_did_you_get_this_number: z.string(),
  is_this_a_sales_call: z.string(),
});

export const coldCallScriptSchema = z.object({
  script_name: z.string(),
  strategy: z.string(),
  opener: z.string(),
  permission_based_opener: z.string(),
  non_permission_opener: z.string(),
  reason_for_call: z.string(),
  thirty_second_pitch: z.string(),
  main_question: z.string(),
  website_preview_pitch: z.string(),
  if_owner_answers: ownerFlow,
  if_gatekeeper_answers: gatekeeperFlow,
  qualification_questions: z.array(z.string()).min(1),
  objection_handlers: objectionHandlers,
  voicemail_script: z.string(),
  quick_follow_up_text: z.string(),
  call_goal: z.string(),
  notes_to_caller: z.array(z.string()).min(1),
});

export type ColdCallScriptJson = z.infer<typeof coldCallScriptSchema>;

export function parseColdCallScript(data: unknown): ColdCallScriptJson {
  return coldCallScriptSchema.parse(data);
}

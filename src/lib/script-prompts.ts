export const SCRIPT_SYSTEM_PROMPT = `You write short cold-call scripts for a solo web designer calling local businesses.

Rules:
- Every line must sound natural read aloud — like a real person, not marketing copy.
- Short sentences. No jargon. No filler ("I hope you're well", "passionate about helping businesses", "game-changer").
- Never invent facts (awards, years in business, "I saw your reviews say…").
- Never say they have "no website." Say: "I couldn't find a website listed on your Google profile" or "when I looked you up, I didn't see a site linked."
- Intro format: "Hi, I'm [FirstName] with [Agency]." — use the caller's first name ONLY if provided. If no first name, say "Hi, this is [Agency]." NEVER say "the owner at" or "owner of [Agency]."
- One goal per call: permission to text/send a preview link, get owner email, or book a 10-minute call — pick ONE and stick to it.
- If a preview URL exists: mention a rough mockup you can text or send a link to — not a finished site. Prefer text/link over email unless they ask for email.
- If no preview URL: offer to put together a quick one-page example if they're open to it.
- Objection replies: 1–2 sentences, acknowledge, small next step.
- Return ONLY valid JSON. No markdown.`;

export const REGENERATION_ANGLES = ["shorter", "more_direct", "friendlier"] as const;

export type RegenerationAngle = (typeof REGENERATION_ANGLES)[number];

export function pickRandomRegenerationAngle(): RegenerationAngle {
  return REGENERATION_ANGLES[Math.floor(Math.random() * REGENERATION_ANGLES.length)]!;
}

export const ANGLE_UI_OPTIONS: { value: string; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "shorter", label: "Shorter" },
  { value: "more_direct", label: "More direct" },
  { value: "friendlier", label: "Friendlier" },
];

export const ANGLE_MODEL_HINTS: Record<string, string> = {
  shorter: "Cut every line by ~30%. Same facts, fewer words.",
  more_direct: "Skip softeners. Name, reason, one benefit, ask — fast.",
  friendlier: "Warm and local, still brief. Mention the city once if natural.",
};

function previewBlock(vars: Record<string, string>): string {
  const raw = (vars.preview_url ?? "").trim();
  const hasPreview =
    raw.length > 0 && raw !== "(none)" && !/^none$/i.test(raw) && !raw.toLowerCase().includes("placeholder");

  if (hasPreview) {
    return `Preview: YES — ${raw}
- Include preview_line: one sentence offering to text or send this link (not "I emailed you").
- Example tone: "I mocked up a quick one-pager on my side — happy to text you the link if you want to glance at it."`;
  }

  return `Preview: NO
- Omit preview_line or set it to "".
- Offer to build a quick example only if they show interest.`;
}

function callerBlock(vars: Record<string, string>): string {
  const name = (vars.caller_name ?? "").trim();
  if (name && !/^the owner$/i.test(name)) {
    return `Caller intro: "Hi, I'm ${name} with ${vars.agency_name}."`;
  }
  return `Caller intro: "Hi, this is ${vars.agency_name}." (No first name available — do NOT say "owner at").`;
}

const JSON_SHAPE = `{
  "script_name": "short title with business name",
  "call_goal": "one sentence — what success looks like on this call",
  "opener": "max 20 words — interrupt acknowledgment + intro",
  "reason": "max 25 words — why you called (soft website language)",
  "pitch": "max 45 words — one concrete benefit for THEIR niche, not a feature list",
  "ask": "one question ending with ? — the main CTA",
  "preview_line": "optional — max 25 words, only if preview exists",
  "gatekeeper": "max 40 words — if staff answers, what to say",
  "objections": {
    "not_interested": "max 30 words",
    "already_have_someone": "max 30 words",
    "no_budget": "max 30 words",
    "send_info": "max 30 words",
    "call_back": "max 30 words"
  },
  "voicemail": "max 50 words",
  "notes": ["tip 1", "tip 2", "tip 3"]
}`;

export function buildNewScriptUserPrompt(vars: Record<string, string>): string {
  return `Write a cold-call script for this lead.

${callerBlock(vars)}
${previewBlock(vars)}

Business:
- Name: ${vars.business_name}
- Type: ${vars.niche}
- City: ${vars.city}
- Phone on file: ${vars.phone}

Agency: ${vars.agency_name}
Offer (one line, paraphrase naturally): ${vars.offer_description}

Word limits are strict. If a line sounds like AI or a brochure, rewrite it plainer.

Return JSON exactly matching this shape:
${JSON_SHAPE}`;
}

export function buildRegenerateScriptUserPrompt(
  vars: Record<string, string>,
  previousScriptJson: string,
  regenerationAngle: string,
): string {
  const hint = ANGLE_MODEL_HINTS[regenerationAngle] ?? "Rewrite with fresh wording.";
  return `Regenerate the script for the same business. ${hint}

${callerBlock(vars)}
${previewBlock(vars)}

Business: ${vars.business_name} (${vars.niche}, ${vars.city})

Previous JSON (do not copy phrases verbatim):
${previousScriptJson}

Same JSON shape as a new script:
${JSON_SHAPE}

Return valid JSON only.`;
}

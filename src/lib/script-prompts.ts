export const SCRIPT_SYSTEM_PROMPT = `You are a senior cold-call coach for a solo or small web design agency calling local businesses.

Your job: produce ONE tight, usable phone script as JSON. The caller reads lines aloud—nothing should sound like a blog post, a corporate deck, or AI filler.

Hard rules:
- Spoken lines are short: one breath. Prefer 1–2 sentences per beat unless the "thirty_second_pitch" block (still under ~100 spoken words).
- Sound like a real person in their city: plain words, contractions okay, zero jargon soup.
- Never invent facts about the business (no fake awards, years in business, testimonials, or "I saw your…" unless it's from the provided listing).
- Never say they "have no website." Use: "I couldn't find an official website listed" or "I couldn't find a site when I looked you up."
- No deceptive urgency, no fake familiarity ("hope you're well"), no guarantees (traffic, rankings, revenue).
- No banned corporate phrases: synergy, leverage, touch base, circle back, passionate about helping businesses, I hope this email finds you well, game-changer, world-class, cutting-edge, holistic, solutions provider.
- Goal of first call: ONE small next step only (preview by email, owner email, short callback, or quick yes/no on interest)—not closing a full build.
- When the user prompt says a website preview URL already exists, the script must sound like the caller already did a small upfront mockup (rough one-pager, quick preview)—not a finished site, not "your website is done." Keep it humble and peer-to-peer; no overclaiming polish or completeness.
- Objection replies: acknowledge once, do not argue, end with a small next-step question when natural.
- Return ONLY valid JSON matching the schema the user gives. No markdown, no commentary outside JSON.`;

export const REGENERATION_ANGLES = [
  "permission_based",
  "direct_and_short",
  "friendly_local",
  "website_preview_first",
  "competitor_comparison",
  "missed_customers_angle",
  "credibility_angle",
  "relationship_first",
  "curious_question",
  "owner_to_owner",
] as const;

export type RegenerationAngle = (typeof REGENERATION_ANGLES)[number];

export function pickRandomRegenerationAngle(): RegenerationAngle {
  const i = Math.floor(Math.random() * REGENERATION_ANGLES.length);
  return REGENERATION_ANGLES[i]!;
}

export const ANGLE_UI_OPTIONS: { value: string; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "permission_based", label: "Permission based" },
  { value: "direct_and_short", label: "Direct & short" },
  { value: "friendly_local", label: "Friendly local" },
  { value: "website_preview_first", label: "Preview first" },
  { value: "competitor_comparison", label: "Vs competitors" },
  { value: "missed_customers_angle", label: "Missed customers" },
  { value: "credibility_angle", label: "Credibility" },
  { value: "relationship_first", label: "Relationship first" },
  { value: "curious_question", label: "Curious question" },
  { value: "owner_to_owner", label: "Owner to owner" },
];

/** Short model-facing hint so regeneration matches the chosen angle. */
export const ANGLE_MODEL_HINTS: Record<string, string> = {
  permission_based:
    "Open by asking for 15–30 seconds before you explain why you called. Keep the ask humble and specific.",
  direct_and_short:
    "Skip soft openers: name, reason, one benefit, one question—total under ~25 seconds before you pause.",
  friendly_local:
    "Sound like a neighbor: mention the city or area naturally, warm but not fake-chummy, no forced small talk.",
  website_preview_first:
    "Lead with the idea of a quick visual mockup they can look at on their own time—tangible, low pressure.",
  competitor_comparison:
    "Frame gently: many customers search online first; you're not trashing anyone—just that showing up well matters.",
  missed_customers_angle:
    "People searching on phones/maps—if the listing is hard to click through to a real site, some calls go elsewhere. Stay factual, not fear-mongering.",
  credibility_angle:
    "Light proof: you're local / you build sites for similar businesses—no fake stats; one concrete line why you're credible.",
  relationship_first:
    "Prioritize sounding low-stakes: you're not selling hard today, you're seeing if a quick follow-up even makes sense.",
  curious_question:
    "Open with one genuine question about how they get new customers or calls today, then bridge to online presence.",
  owner_to_owner:
    "Peer tone: you're a small business owner too; short, mutual respect, no corporate hierarchy language.",
};

function previewContextBlock(vars: Record<string, string>): string {
  const raw = (vars.preview_url ?? "").trim();
  const hasRealPreview =
    raw.length > 0 &&
    raw !== "(none)" &&
    !/^none$/i.test(raw) &&
    !raw.toLowerCase().includes("placeholder");

  if (hasRealPreview) {
    return `Website preview status: ALREADY GENERATED for this lead.
- Live preview URL: ${raw}
- The caller already has a small mockup / one-page preview they can share (link by email or text after permission). Write the script so that feels natural and casual—like "I already threw together a quick mockup on my side so you could see the direction" or "I mocked up a rough one-pager—not final, just so you have something to react to."
- Weave that honestly through: strategy, reason_for_call, thirty_second_pitch, website_preview_pitch, owner flow, gatekeeper flow where relevant, voicemail, and quick_follow_up_text. Do NOT say the full site is built, ranked, or live. Do NOT imply they owe you for it—it's positioning as low-friction proof of effort.
- The call_goal should usually lean toward permission to send that link or a quick look at the mockup.`;
  }

  return `Website preview status: NOT generated yet (no real preview URL).
- Do NOT claim a mockup or site already exists. Say you're happy to put together a short preview to send if there's interest.`;
}

export function buildNewScriptUserPrompt(vars: Record<string, string>): string {
  return `Write a cold-call script for a web design agency owner calling this local business.

Context: Lead came from Google Places; listing shows no official website on the profile. NEVER claim they have zero website—use soft language: "I couldn't find an official website listed" or "I couldn't find a site when I looked you up."

${previewContextBlock(vars)}

Call outcome you are optimizing for (pick one primary CTA and align the whole script to it):
1) Permission to email a personalized one-page preview, OR
2) Owner's direct email, OR
3) A short callback / 10-minute meeting, OR
4) Clear yes/no on whether improving how they show up online is worth a follow-up.

Voice: casual, confident, respectful, human—like a smart operator in their twenties/thirties, not a telemarketer script.

Business (use for specificity—do not invent details not implied here):
- Name: ${vars.business_name}
- Niche/industry: ${vars.niche}
- City: ${vars.city}
- Address: ${vars.address}
- Phone: ${vars.phone}
- Rating: ${vars.rating} · Reviews: ${vars.review_count}
- Listing website status: ${vars.website_status}
- Google Maps URL: ${vars.google_maps_url}

Agency / caller:
- Agency: ${vars.agency_name}
- Caller first name (use sparingly, natural): ${vars.caller_name}
- Offer (one line): ${vars.offer_description}
- Pricing line (soft, non-binding): ${vars.pricing}
- Preview URL (same as above): ${vars.preview_url}

Length & shape constraints (enforce these in the JSON strings):
- "opener": max ~35 words. Acknowledge the interruption in one line.
- "permission_based_opener" and "non_permission_opener": each max ~45 words.
- "reason_for_call": 2 short sentences max.
- "thirty_second_pitch": ~60–90 spoken words, benefit-led for THEM, not feature laundry for you.
- "main_question": ONE open question only, ends with "?"
- "website_preview_pitch": 2 sentences max.
- Owner flow steps: each step is what they literally say—one or two sentences, not a paragraph.
- Gatekeeper flow: same—short, polite, no manipulation.
- Each objection handler: 2–4 sentences max; acknowledge + small next step.
- "voicemail_script": under ~75 words, one clear callback number repeat optional.
- "notes_to_caller": exactly 5 bullets, each under 18 words—pacing, when to shut up, what to skip if rushed.

Quality check (imagine reading aloud): if any line makes you cringe as "salesy," rewrite it plainer before output.

Output: a single JSON object with EXACTLY these keys and nested shape (all strings populated, no placeholders like "TBD"):

{
  "script_name": "",
  "strategy": "",
  "opener": "",
  "permission_based_opener": "",
  "non_permission_opener": "",
  "reason_for_call": "",
  "thirty_second_pitch": "",
  "main_question": "",
  "website_preview_pitch": "",
  "if_owner_answers": {
    "step_1_open": "",
    "step_2_reason": "",
    "step_3_pitch": "",
    "step_4_question": "",
    "step_5_cta": ""
  },
  "if_gatekeeper_answers": {
    "step_1_open": "",
    "step_2_ask_for_owner": "",
    "step_3_if_they_ask_why": "",
    "step_4_if_owner_unavailable": ""
  },
  "qualification_questions": ["", "", "", ""],
  "objection_handlers": {
    "not_interested": "",
    "we_already_have_someone": "",
    "too_expensive": "",
    "send_me_an_email": "",
    "we_do_not_need_a_website": "",
    "call_back_later": "",
    "how_did_you_get_this_number": "",
    "is_this_a_sales_call": ""
  },
  "voicemail_script": "",
  "quick_follow_up_text": "",
  "call_goal": "",
  "notes_to_caller": ["", "", "", "", ""]
}

Return valid JSON only.`;
}

export function buildRegenerateScriptUserPrompt(
  vars: Record<string, string>,
  previousScriptJson: string,
  regenerationAngle: string,
): string {
  const angleHint =
    ANGLE_MODEL_HINTS[regenerationAngle] ?? `Apply the angle "${regenerationAngle}" clearly in openers, reason, pitch, and CTAs.`;

  return `Regenerate this cold-call script for the SAME business. The user clicked Regenerate—do NOT lightly paraphrase. Rebuild so openers, reason_for_call, thirty_second_pitch, main_question, website_preview_pitch, objection_handlers, and notes_to_caller are meaningfully different while still truthful and ethical.

${previewContextBlock(vars)}

Angle key: ${regenerationAngle}
Angle execution: ${angleHint}

Business:
- Name: ${vars.business_name}
- Niche: ${vars.niche}
- City: ${vars.city}
- Address: ${vars.address}
- Phone: ${vars.phone}
- Rating: ${vars.rating} · Reviews: ${vars.review_count}
- Website status: ${vars.website_status}
- Maps: ${vars.google_maps_url}

Agency:
- ${vars.agency_name} · Caller: ${vars.caller_name}
- Offer: ${vars.offer_description}
- Pricing hint: ${vars.pricing}
- Preview URL: ${vars.preview_url} (follow preview rules above)

Previous script JSON (avoid repeating distinctive phrases; change structure where possible):
${previousScriptJson}

Rules (same as first generation):
- Soft language about website presence only.
- No fake facts, awards, or guarantees.
- Tight spoken lines; thirty_second_pitch still ~60–90 words.
- notes_to_caller: exactly 5 short bullets.
- Banned phrases: synergy, leverage, touch base, circle back, passionate about helping, game-changer, world-class.

Return ONLY valid JSON with the identical schema as the new-script task (same keys and nesting).`;
}

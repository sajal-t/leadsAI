import OpenAI from "openai";

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }
  return new OpenAI({ apiKey });
}

export async function jsonCompletion(prompt: string) {
  const response = await getOpenAI().responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
    text: { format: { type: "json_object" } },
  });
  const output = response.output_text;
  return JSON.parse(output);
}

/** System + user instructions in one input (Responses API). */
export async function jsonCompletionWithSystem(system: string, user: string) {
  const combined = `${system.trim()}\n\n---\n\n${user.trim()}`;
  return jsonCompletion(combined);
}

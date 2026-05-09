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

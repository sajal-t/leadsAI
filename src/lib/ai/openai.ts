import OpenAI from "openai";

export async function generateWithOpenAI({
  systemPrompt,
  userPrompt,
  temperature = 0.25,
  maxTokens = 8000,
}: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in environment variables.");
  }

  const client = new OpenAI({ apiKey });

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content;
    if (!content?.trim()) {
      throw new Error("OpenAI returned an empty response.");
    }
    return content;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[generateWithOpenAI]", msg);
    if (msg.includes("Missing OPENAI_API_KEY")) throw e;
    throw new Error("OpenAI request failed. Check your API key and try again.");
  }
}

import { streamWithHuggingFace } from "@/lib/ai/huggingface-stream";
import { getHfModelEdit, getHfModelInitial, getHfProviderEdit, getHfProviderInitial } from "@/lib/ai/hf-env";
import OpenAI from "openai";

export type StreamWebsiteArgs = {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  /** Which HF model/provider pair to use (initial site vs edit). */
  hfProfile?: "initial" | "edit";
};

async function* streamWithOpenAI(args: StreamWebsiteArgs): AsyncGenerator<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY in environment variables.");

  const client = new OpenAI({ apiKey });

  try {
    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: args.systemPrompt },
        { role: "user", content: args.userPrompt },
      ],
      temperature: args.temperature ?? 0.25,
      max_tokens: args.maxTokens ?? 12_000,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (typeof delta === "string" && delta.length > 0) {
        yield delta;
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[streamWithOpenAI]", msg);
    if (msg.includes("Missing OPENAI_API_KEY")) throw e;
    throw new Error("OpenAI streaming failed. Check your API key.");
  }
}

/** Stream assistant text deltas from the configured AI provider. */
export async function* streamWebsiteModel(args: StreamWebsiteArgs): AsyncGenerator<string> {
  const provider = (process.env.AI_PROVIDER || "huggingface").toLowerCase();
  if (provider === "openai") {
    yield* streamWithOpenAI(args);
    return;
  }

  const profile = args.hfProfile ?? "initial";
  const model = profile === "edit" ? getHfModelEdit() : getHfModelInitial();
  const hfProvider = profile === "edit" ? getHfProviderEdit() : getHfProviderInitial();

  yield* streamWithHuggingFace({
    systemPrompt: args.systemPrompt,
    messages: [{ role: "user", content: args.userPrompt }],
    model,
    provider: hfProvider,
    temperature: args.temperature ?? 0.25,
    maxTokens: args.maxTokens ?? 12_000,
  });
}

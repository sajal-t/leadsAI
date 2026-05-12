import { InferenceClient, type InferenceProviderOrPolicy } from "@huggingface/inference";

export type HfChatMessage = { role: "user" | "assistant" | "system"; content: string };

/**
 * Stream chat completion deltas from Hugging Face Inference API.
 * Yields assistant text chunks only (server-side; never expose raw HF errors to clients).
 */
export async function* streamWithHuggingFace({
  systemPrompt,
  messages,
  model,
  provider,
  temperature = 0.25,
  maxTokens = 12_000,
}: {
  systemPrompt: string;
  messages: HfChatMessage[];
  model?: string;
  provider?: InferenceProviderOrPolicy;
  temperature?: number;
  maxTokens?: number;
}): AsyncGenerator<string, void, undefined> {
  const token = process.env.HF_TOKEN?.trim();
  const resolvedModel = (model || "").trim();
  const resolvedProvider = (provider ?? "auto") as InferenceProviderOrPolicy;

  if (!token) {
    throw new Error("Missing HF_TOKEN in environment variables.");
  }
  if (!resolvedModel) {
    throw new Error("Missing HF_MODEL (or HF_MODEL_INITIAL / HF_MODEL_EDIT) in environment variables.");
  }

  const client = new InferenceClient(token);

  const fullMessages: HfChatMessage[] = [{ role: "system", content: systemPrompt }, ...messages];

  try {
    const stream = client.chatCompletionStream({
      model: resolvedModel,
      provider: resolvedProvider,
      messages: fullMessages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta.length > 0) {
        yield delta;
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[streamWithHuggingFace]", msg);
    if (msg.includes("Missing HF_")) throw e;
    throw new Error("Hugging Face streaming failed. Check your model, provider, and token.");
  }
}

import { InferenceClient, type InferenceProviderOrPolicy } from "@huggingface/inference";
import { getHfModelEdit, getHfModelInitial, getHfProviderEdit, getHfProviderInitial } from "@/lib/ai/hf-env";

export async function generateWithHuggingFace({
  systemPrompt,
  userPrompt,
  temperature = 0.25,
  maxTokens = 12_000,
  hfProfile = "initial",
}: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  hfProfile?: "initial" | "edit";
}): Promise<string> {
  const token = process.env.HF_TOKEN?.trim();
  const model = hfProfile === "edit" ? getHfModelEdit() : getHfModelInitial();
  const provider = (hfProfile === "edit" ? getHfProviderEdit() : getHfProviderInitial()) as InferenceProviderOrPolicy;

  if (!token) {
    throw new Error("Missing HF_TOKEN in environment variables.");
  }
  if (!model) {
    throw new Error("Missing HF_MODEL (or HF_MODEL_INITIAL / HF_MODEL_EDIT) in environment variables.");
  }

  const client = new InferenceClient(token);

  try {
    const response = await client.chatCompletion({
      model,
      provider,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    const raw = response.choices?.[0]?.message?.content;
    const content = typeof raw === "string" ? raw : raw == null ? "" : String(raw);

    if (!content.trim()) {
      throw new Error("Hugging Face returned an empty response.");
    }
    return content;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[generateWithHuggingFace]", msg);
    if (msg.includes("Missing HF_")) throw e;
    throw new Error("Hugging Face request failed. Check your model, provider, and token, then try again.");
  }
}

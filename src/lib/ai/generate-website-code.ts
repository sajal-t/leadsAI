import { generateWithHuggingFace } from "@/lib/ai/huggingface";
import { generateWithOpenAI } from "@/lib/ai/openai";

export async function generateWebsiteCode({
  systemPrompt,
  userPrompt,
  temperature,
  maxTokens,
  hfProfile = "initial",
}: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  hfProfile?: "initial" | "edit";
}): Promise<string> {
  const provider = (process.env.AI_PROVIDER || "huggingface").toLowerCase();

  if (provider === "openai") {
    return generateWithOpenAI({ systemPrompt, userPrompt, temperature, maxTokens });
  }

  return generateWithHuggingFace({ systemPrompt, userPrompt, temperature, maxTokens, hfProfile });
}

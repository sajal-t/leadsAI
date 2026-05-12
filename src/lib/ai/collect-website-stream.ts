import type { WebsiteStreamEvent } from "@/lib/ai/sse-stream-events";
import { generateWebsiteCode } from "@/lib/ai/generate-website-code";
import { streamWebsiteModel } from "@/lib/ai/stream-website-model";
import type { StreamWebsiteArgs } from "@/lib/ai/stream-website-model";

/**
 * Streams model deltas via onEvent; on empty stream or stream failure before any chunk,
 * falls back to non-streaming generateWebsiteCode (with a phase event).
 */
export async function collectWebsiteModelWithStreamingFallback(
  args: StreamWebsiteArgs,
  onEvent: (e: WebsiteStreamEvent) => void,
): Promise<string> {
  let full = "";
  let chunks = 0;

  try {
    for await (const chunk of streamWebsiteModel(args)) {
      chunks++;
      full += chunk;
      onEvent({ type: "delta", content: chunk });
    }
  } catch (err) {
    if (chunks === 0) {
      onEvent({ type: "phase", message: "Generating…" });
      full = await generateWebsiteCode({
        systemPrompt: args.systemPrompt,
        userPrompt: args.userPrompt,
        temperature: args.temperature,
        maxTokens: args.maxTokens,
        hfProfile: args.hfProfile,
      });
      if (full.trim()) {
        onEvent({ type: "delta", content: full });
      }
      return full;
    }
    throw err;
  }

  if (!full.trim()) {
    onEvent({ type: "phase", message: "Generating…" });
    full = await generateWebsiteCode({
      systemPrompt: args.systemPrompt,
      userPrompt: args.userPrompt,
      temperature: args.temperature,
      maxTokens: args.maxTokens,
      hfProfile: args.hfProfile,
    });
    if (full.trim()) {
      onEvent({ type: "delta", content: full });
    }
  }

  return full;
}

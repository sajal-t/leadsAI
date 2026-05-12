export type WebsiteCompletePayload = {
  project_id?: string;
  preview_slug?: string | null;
  studio_url?: string;
  preview_url?: string;
  files?: { path: string; language: string; content: string }[];
  project_name?: string;
};

function dispatchEvent(
  jsonStr: string,
  callbacks: {
    onPhase?: (message: string) => void;
    onDelta?: (content: string) => void;
    onComplete?: (payload: WebsiteCompletePayload) => void;
    onError?: (message: string) => void;
  },
): void {
  try {
    const ev = JSON.parse(jsonStr) as {
      type: string;
      message?: string;
      content?: string;
    } & Record<string, unknown>;

    if (ev.type === "phase" && typeof ev.message === "string") {
      callbacks.onPhase?.(ev.message);
    } else if (ev.type === "delta" && typeof ev.content === "string") {
      callbacks.onDelta?.(ev.content);
    } else if (ev.type === "complete") {
      callbacks.onComplete?.(ev as WebsiteCompletePayload);
    } else if (ev.type === "error" && typeof ev.message === "string") {
      callbacks.onError?.(ev.message);
    }
  } catch {
    /* malformed JSON line */
  }
}

function processSseBlock(
  block: string,
  callbacks: {
    onPhase?: (message: string) => void;
    onDelta?: (content: string) => void;
    onComplete?: (payload: WebsiteCompletePayload) => void;
    onError?: (message: string) => void;
  },
): void {
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    dispatchEvent(trimmed.slice(5).trim(), callbacks);
  }
}

/**
 * Consumes Server-Sent Events from website generation/edit endpoints (`data: {...}` blocks).
 */
export async function consumeWebsiteSse(
  response: Response,
  callbacks: {
    onPhase?: (message: string) => void;
    onDelta?: (content: string) => void;
    onComplete?: (payload: WebsiteCompletePayload) => void;
    onError?: (message: string) => void;
  },
): Promise<void> {
  if (!response.ok) {
    const ct = response.headers.get("content-type");
    if (ct?.includes("application/json")) {
      const j = (await response.json().catch(() => null)) as { error?: string } | null;
      callbacks.onError?.(typeof j?.error === "string" ? j.error : `Failed (${response.status})`);
      return;
    }
    callbacks.onError?.(`Failed (${response.status})`);
    return;
  }

  if (!response.body) {
    callbacks.onError?.("No response body.");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r\n/g, "\n");

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      processSseBlock(block, callbacks);
    }
  }

  buffer = buffer.replace(/\r\n/g, "\n");
  if (buffer.trim()) {
    processSseBlock(buffer, callbacks);
  }
}

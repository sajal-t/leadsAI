export type WebsiteStreamEvent =
  | { type: "phase"; message: string }
  | { type: "delta"; content: string }
  | {
      type: "complete";
      project_id?: string;
      preview_slug?: string | null;
      studio_url?: string;
      preview_url?: string;
      files?: { path: string; language: string; content: string }[];
      project_name?: string;
    }
  | { type: "error"; message: string };

const encoder = new TextEncoder();

export function sseDataLine(event: WebsiteStreamEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

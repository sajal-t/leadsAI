import type { AiWebsiteFile } from "@/lib/ai/parse-website-files";

const SYSTEM_PROMPT = `You are an expert frontend developer editing an existing static website. You must return the full updated project as valid JSON. Do not return diffs. Do not use markdown. Do not include explanations. Preserve existing functionality unless the user asks to change it.`;

export function buildEditSitePrompt(userInstruction: string, files: AiWebsiteFile[]): { systemPrompt: string; userPrompt: string } {
  const currentFilesJson = JSON.stringify(
    { files: files.map((f) => ({ path: f.path, language: f.language, content: f.content })) },
    null,
    2,
  );

  const userPrompt = `The user wants to edit an existing website.

User instruction:
${userInstruction}

Current files:
${currentFilesJson}

Rules:
- Return valid JSON only.
- Return the full updated files array, not a diff.
- Keep the same JSON shape:
{
  "project_name": "string",
  "files": [
    {
      "path": "index.html",
      "language": "html",
      "content": "string"
    }
  ]
}
- Preserve file paths unless a new file is necessary.
- Do not remove important sections unless the user asks.
- Do not invent fake testimonials, awards, certifications, or guarantees.
- Keep the site mobile responsive.
- Make the requested change clearly visible in the updated files.`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

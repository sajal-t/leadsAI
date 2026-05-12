export const DEEPSITE_DIFF_EDIT_SYSTEM_PROMPT = `You are editing an existing single-file HTML website. You must not return the whole file. Return only SEARCH/REPLACE blocks. The SEARCH content must exactly match a snippet from the current HTML. The REPLACE content should be the updated version. You may return multiple blocks. Do not use markdown code fences. Do not explain unless absolutely necessary. Preserve the existing page unless the user asks to change it.

Diff format (repeat as needed):

<<<<<<< SEARCH
exact original snippet here
=======
replacement snippet here
>>>>>>> REPLACE`;

export function buildDeepsiteDiffEditUserPrompt(vars: {
  previous_prompt: string;
  current_html: string;
  user_instruction: string;
}): string {
  return `The user wants to edit this existing website.

Previous prompt:
${vars.previous_prompt}

Current HTML:
\`\`\`html
${vars.current_html}
\`\`\`

User's new edit request:
${vars.user_instruction}

Return only SEARCH/REPLACE blocks in the required format. SEARCH must match the current HTML exactly (including whitespace where it matters).`;
}

import DiffMatchPatch from "diff-match-patch";

export type SearchReplaceBlock = { search: string; replace: string };

const BLOCK_RE = /<<<<<<< SEARCH\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> REPLACE/g;

/**
 * Parse DeepSite-style SEARCH/REPLACE blocks from model output.
 */
export function parseSearchReplaceBlocks(raw: string): SearchReplaceBlock[] {
  const cleaned = raw.replace(/```[\w]*\s*|\s*```/g, "").trim();
  return [...cleaned.matchAll(BLOCK_RE)].map((m) => ({ search: m[1]!, replace: m[2]! }));
}

export type ApplyReplaceBlocksResult = {
  html: string;
  applied: number;
  errors: string[];
  /** Character-level change size (via diff-match-patch) after a successful apply. */
  changeSize: number;
};

/**
 * Apply all SEARCH/REPLACE blocks in order, or return the original HTML if any block fails (atomic).
 * Uses diff-match-patch to summarize the overall edit magnitude after a successful apply.
 */
export function applySearchReplaceBlocks(baseHtml: string, rawModelOutput: string): ApplyReplaceBlocksResult {
  const blocks = parseSearchReplaceBlocks(rawModelOutput);
  const errors: string[] = [];
  if (blocks.length === 0) {
    errors.push("No valid SEARCH/REPLACE blocks found in the model output.");
    return { html: baseHtml, applied: 0, errors, changeSize: 0 };
  }

  let sim = baseHtml;
  for (let i = 0; i < blocks.length; i++) {
    const { search, replace } = blocks[i]!;
    if (!search) {
      errors.push(`Block ${i + 1}: empty SEARCH.`);
      return { html: baseHtml, applied: 0, errors, changeSize: 0 };
    }
    const idx = sim.indexOf(search);
    if (idx === -1) {
      errors.push(`Block ${i + 1}: SEARCH text not found in HTML (exact match required).`);
      return { html: baseHtml, applied: 0, errors, changeSize: 0 };
    }
    const dup = sim.indexOf(search, idx + search.length);
    if (dup !== -1) {
      errors.push(`Block ${i + 1}: SEARCH matches multiple times; refusing to apply ambiguous edit.`);
      return { html: baseHtml, applied: 0, errors, changeSize: 0 };
    }
    sim = sim.slice(0, idx) + replace + sim.slice(idx + search.length);
  }

  const dmp = new DiffMatchPatch();
  const diffs = dmp.diff_main(baseHtml, sim);
  dmp.diff_cleanupSemantic(diffs);
  const changeSize = dmp.diff_levenshtein(diffs);

  return { html: sim, applied: blocks.length, errors: [], changeSize };
}

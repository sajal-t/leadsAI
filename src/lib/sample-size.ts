/** User-facing target for merged unique Google Places results (multi-query). */
export function clampSampleSize(n: number): number {
  if (!Number.isFinite(n)) return 500;
  return Math.min(2000, Math.max(60, Math.floor(n)));
}

export const DEFAULT_SAMPLE_SIZE = 500;

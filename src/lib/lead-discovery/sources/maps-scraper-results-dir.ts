import path from "path";

/**
 * Writable directory for scraper input/output files.
 * On Railway/Docker the app runs as non-root; never use /app/tmp (EACCES).
 */
export function resolveMapsScraperResultsDir(): string {
  const raw = process.env.MAPS_SCRAPER_RESULTS_DIR?.trim();
  const fallback =
    process.env.NODE_ENV === "production"
      ? "/tmp/maps-scraper-results"
      : path.resolve("./tmp/maps-scraper-results");

  if (!raw) return fallback;

  const resolved = path.isAbsolute(raw) ? raw : path.resolve(raw);

  // Relative ./tmp from local .env becomes /app/tmp in the container — not writable.
  if (
    process.env.NODE_ENV === "production" &&
    (resolved === "/app/tmp" || resolved.startsWith("/app/tmp/"))
  ) {
    return "/tmp/maps-scraper-results";
  }

  return resolved;
}

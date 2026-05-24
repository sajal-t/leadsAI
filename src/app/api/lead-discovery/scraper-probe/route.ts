import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import {
  getMapsScraperConfig,
  resolveMapsScraperBinaryPath,
} from "@/lib/lead-discovery/sources/google-maps-scraper";
import { runGoogleMapsScraperCli } from "@/lib/lead-discovery/sources/google-maps-scraper-cli";
import { resolveMapsScraperResultsDir } from "@/lib/lead-discovery/sources/maps-scraper-results-dir";

/**
 * Runs a tiny scrape to verify Railway/Docker scraper setup (logged-in users only).
 * Expect ~1–3 minutes. Check meta in response or Railway deploy logs on failure.
 */
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;

  const cfg = getMapsScraperConfig();
  const resolvedBin = await resolveMapsScraperBinaryPath();
  const binaryPresent = cfg.mode === "docker" || cfg.dockerEnabled || resolvedBin != null;

  if (!cfg.enabled || !binaryPresent) {
    return NextResponse.json(
      {
        ok: false,
        error: "Scraper not ready",
        config: { ...cfg, binary_present: binaryPresent },
        results_dir: resolveMapsScraperResultsDir(),
      },
      { status: 503 },
    );
  }

  const jobId = `probe-${Date.now()}`;
  const started = Date.now();

  try {
    const rows = await runGoogleMapsScraperCli({
      queries: ["coffee shop in Seattle, WA"],
      jobId,
      depth: 2,
    });
    return NextResponse.json({
      ok: true,
      rows: rows.length,
      duration_ms: Date.now() - started,
      results_dir: resolveMapsScraperResultsDir(),
      binary: cfg.binaryPath,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[scraper-probe]", message);
    return NextResponse.json(
      {
        ok: false,
        error: message.slice(0, 1500),
        duration_ms: Date.now() - started,
        results_dir: resolveMapsScraperResultsDir(),
        binary: cfg.binaryPath,
      },
      { status: 502 },
    );
  }
}

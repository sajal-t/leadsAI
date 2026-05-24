import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import {
  getMapsScraperConfig,
  resolveMapsScraperBinaryPath,
} from "@/lib/lead-discovery/sources/google-maps-scraper";

export async function GET(request: Request) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;

  const cfg = getMapsScraperConfig();
  const resolvedBin = await resolveMapsScraperBinaryPath();
  const binaryPresent = cfg.mode === "docker" || cfg.dockerEnabled || resolvedBin != null;

  let reason: string | null = null;
  if (!cfg.enabled) reason = "scraper_disabled";
  else if (cfg.mode === "cli" && !cfg.dockerEnabled && !binaryPresent) reason = "binary_not_found";

  return NextResponse.json({
    google_maps_scraper: {
      enabled: cfg.enabled,
      mode: cfg.mode,
      binary_configured: cfg.binaryConfigured,
      binary_present: binaryPresent,
      binary_path: resolvedBin ?? cfg.binaryPath,
      configured_path: cfg.binaryPath,
      ready: cfg.enabled && binaryPresent,
      docker_enabled: cfg.dockerEnabled,
      docker_image_configured: Boolean(process.env.MAPS_SCRAPER_DOCKER_IMAGE?.trim()),
      reason,
      deploy_hint:
        reason === "scraper_disabled"
          ? "Set MAPS_SCRAPER_ENABLED=true in Railway Variables."
          : reason === "binary_not_found"
            ? "Use Dockerfile deploy (not Railpack). Set MAPS_SCRAPER_BIN=/usr/bin/google-maps-scraper and redeploy."
            : null,
    },
  });
}

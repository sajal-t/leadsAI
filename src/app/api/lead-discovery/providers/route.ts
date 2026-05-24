import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import {
  getMapsScraperConfig,
  isMapsScraperBinaryPresent,
} from "@/lib/lead-discovery/sources/google-maps-scraper";

export async function GET(request: Request) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;

  const cfg = getMapsScraperConfig();
  const binaryPresent = await isMapsScraperBinaryPresent();

  return NextResponse.json({
    google_maps_scraper: {
      enabled: cfg.enabled,
      mode: cfg.mode,
      binary_configured: cfg.binaryConfigured,
      binary_present: binaryPresent,
      binary_path: cfg.binaryPath,
      ready: cfg.enabled && (cfg.mode === "docker" || cfg.dockerEnabled ? true : binaryPresent),
      docker_enabled: cfg.dockerEnabled,
      docker_image_configured: Boolean(process.env.MAPS_SCRAPER_DOCKER_IMAGE?.trim()),
      deploy_hint:
        cfg.enabled && cfg.mode === "cli" && cfg.binaryConfigured && !binaryPresent
          ? "Scraper env is set but the binary is missing. Redeploy with Dockerfile builder (not Railpack)."
          : null,
    },
  });
}

import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { getMapsScraperConfig } from "@/lib/lead-discovery/sources/google-maps-scraper";

export async function GET(request: Request) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;

  const cfg = getMapsScraperConfig();

  return NextResponse.json({
    google_maps_scraper: {
      enabled: cfg.enabled,
      mode: cfg.mode,
      binary_configured: cfg.binaryConfigured,
      docker_enabled: cfg.dockerEnabled,
      docker_image_configured: Boolean(process.env.MAPS_SCRAPER_DOCKER_IMAGE?.trim()),
    },
  });
}

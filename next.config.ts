import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Pin Turbopack to this app so a stray `package-lock.json` in the parent folder does not steal the workspace root. */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  /** Playwright is Node-only; do not bundle for Edge. */
  serverExternalPackages: ["playwright", "playwright-core"],
};

export default nextConfig;

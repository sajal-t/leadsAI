import { spawn } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { MapsScraperError } from "./google-maps-scraper-cli";
import { resolveMapsScraperResultsDir } from "./maps-scraper-results-dir";

function spawnDocker(args: string[], timeoutMs: number): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new MapsScraperError(`Docker scraper timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new MapsScraperError(err.message));
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stderr });
    });
  });
}

/** Re-use CLI output reader via dynamic import to avoid duplication. */
async function readOutputRows(outputBase: string): Promise<Record<string, unknown>[]> {
  const { readFile, access } = await import("fs/promises");
  const candidates = [`${outputBase}.json`, `${outputBase}.csv`, outputBase];
  for (const filePath of candidates) {
    try {
      await access(filePath);
    } catch {
      continue;
    }
    const text = await readFile(filePath, "utf8");
    if (filePath.endsWith(".csv")) {
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) return [];
      const header = lines[0]!.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const rows: Record<string, unknown>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols =
          lines[i]!.match(/("([^"]|"")*"|[^,]*)/g)?.map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"')) ?? [];
        const row: Record<string, unknown> = {};
        header.forEach((key, ix) => {
          row[key] = cols[ix]?.trim() ?? "";
        });
        rows.push(row);
      }
      return rows;
    }
    const trimmed = text.trim();
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.places)) return obj.places as Record<string, unknown>[];
      if (Array.isArray(obj.results)) return obj.results as Record<string, unknown>[];
    }
    return [];
  }
  throw new MapsScraperError("Docker scraper output file missing");
}

/**
 * Run google-maps-scraper inside Docker with mounted results directory.
 */
function scraperDepth(override?: number): number {
  if (override != null && Number.isFinite(override)) {
    return Math.min(20, Math.max(1, Math.round(override)));
  }
  const n = Number(process.env.MAPS_SCRAPER_DEPTH ?? "10");
  return Number.isFinite(n) && n >= 1 ? Math.min(20, Math.round(n)) : 10;
}

function scraperExtraArgs(opts?: { depth?: number }): string[] {
  const args: string[] = ["-depth", String(scraperDepth(opts?.depth))];
  if (process.env.MAPS_SCRAPER_FAST_MODE === "true") {
    args.push("-fast-mode");
  }
  const lang = process.env.MAPS_SCRAPER_LANG?.trim();
  if (lang) args.push("-lang", lang);
  const geo = process.env.MAPS_SCRAPER_GEO?.trim();
  if (geo) args.push("-geo", geo);
  const zoom = process.env.MAPS_SCRAPER_ZOOM?.trim();
  if (zoom) args.push("-zoom", zoom);
  return args;
}

export async function runGoogleMapsScraperDocker(options: {
  queries: string[];
  jobId: string;
  depth?: number;
}): Promise<Record<string, unknown>[]> {
  const image = process.env.MAPS_SCRAPER_DOCKER_IMAGE?.trim();
  if (!image) throw new MapsScraperError("MAPS_SCRAPER_DOCKER_IMAGE is not set");

  const resultsDir = resolveMapsScraperResultsDir();
  const timeoutMs = Number(process.env.MAPS_SCRAPER_TIMEOUT_MS ?? "180000");

  await mkdir(resultsDir, { recursive: true });

  const inputName = `${options.jobId}-input.txt`;
  const inputHost = path.join(resultsDir, inputName);
  const outputBase = path.join(resultsDir, options.jobId);
  const lines = options.queries.map((q) => q.trim()).filter((q) => q.length > 0);
  if (lines.length === 0) {
    throw new MapsScraperError("No scrape queries provided");
  }
  await writeFile(inputHost, `${lines.join("\n")}\n`, "utf8");

  const containerIn = `/data/${inputName}`;
  const containerOut = `/data/${options.jobId}`;

  const args = [
    "run",
    "--rm",
    "-v",
    `${resultsDir}:/data`,
    image,
    "-input",
    containerIn,
    "-results",
    containerOut,
    "-json",
    ...scraperExtraArgs({ depth: options.depth }),
  ];

  const perQueryTimeout =
    lines.length <= 1 ? timeoutMs : Math.max(timeoutMs, timeoutMs * Math.min(lines.length, 4));
  const { code, stderr } = await spawnDocker(args, perQueryTimeout);
  if (code !== 0) {
    throw new MapsScraperError(
      stderr.trim().slice(0, 800) || `Docker scraper exited with code ${code}`,
    );
  }

  return readOutputRows(outputBase);
}

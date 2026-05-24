import { spawn } from "child_process";
import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export class MapsScraperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MapsScraperError";
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function spawnScraper(
  command: string,
  args: string[],
  timeoutMs: number,
  cwd?: string,
): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new MapsScraperError(`Google Maps scraper timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(new MapsScraperError(`Scraper binary not found: ${command}`));
      } else {
        reject(new MapsScraperError(err.message));
      }
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stderr });
    });
  });
}

function parseJsonRows(text: string): Record<string, unknown>[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) return parsed.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.places)) return obj.places as Record<string, unknown>[];
      if (Array.isArray(obj.results)) return obj.results as Record<string, unknown>[];
      return [obj];
    }
  } catch {
    /* line-delimited JSON */
  }
  const rows: Record<string, unknown>[] = [];
  for (const line of trimmed.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const row = JSON.parse(t) as unknown;
      if (row && typeof row === "object") rows.push(row as Record<string, unknown>);
    } catch {
      /* skip */
    }
  }
  return rows;
}

function parseCsvRows(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0]!.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.match(/("([^"]|"")*"|[^,]*)/g)?.map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"')) ?? [];
    const row: Record<string, unknown> = {};
    header.forEach((key, ix) => {
      row[key] = cols[ix]?.trim() ?? "";
    });
    rows.push(row);
  }
  return rows;
}

async function readOutputRows(outputBase: string): Promise<Record<string, unknown>[]> {
  const candidates = [`${outputBase}.json`, `${outputBase}.csv`, outputBase];
  for (const filePath of candidates) {
    if (!(await fileExists(filePath))) continue;
    const text = await readFile(filePath, "utf8");
    if (filePath.endsWith(".csv")) return parseCsvRows(text);
    return parseJsonRows(text);
  }
  throw new MapsScraperError("Scraper output file missing (expected .json or .csv next to results path)");
}

/**
 * Run google-maps-scraper CLI (no shell). Flags follow upstream: -input, -results, -json.
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

export async function runGoogleMapsScraperCli(options: {
  /** One or more Maps search phrases (one per line in -input). */
  queries: string[];
  jobId: string;
  /** Scroll depth per query (default 10). */
  depth?: number;
}): Promise<Record<string, unknown>[]> {
  const enabled = process.env.MAPS_SCRAPER_ENABLED === "true";
  if (!enabled) throw new MapsScraperError("MAPS_SCRAPER_ENABLED is not true");

  const bin = process.env.MAPS_SCRAPER_BIN?.trim();
  if (!bin) throw new MapsScraperError("Missing MAPS_SCRAPER_BIN");

  const resultsDir = path.resolve(process.env.MAPS_SCRAPER_RESULTS_DIR?.trim() || "./tmp/maps-scraper-results");
  const timeoutMs = Number(process.env.MAPS_SCRAPER_TIMEOUT_MS ?? "180000");
  if (!Number.isFinite(timeoutMs) || timeoutMs < 10_000) {
    throw new MapsScraperError("MAPS_SCRAPER_TIMEOUT_MS must be at least 10000");
  }

  await mkdir(resultsDir, { recursive: true });

  const inputPath = path.join(resultsDir, `${options.jobId}-input.txt`);
  const outputBase = path.join(resultsDir, options.jobId);

  const lines = options.queries.map((q) => q.trim()).filter((q) => q.length > 0);
  if (lines.length === 0) {
    throw new MapsScraperError("No scrape queries provided");
  }

  await writeFile(inputPath, `${lines.join("\n")}\n`, "utf8");

  const perQueryTimeout =
    lines.length <= 1 ? timeoutMs : Math.max(timeoutMs, timeoutMs * Math.min(lines.length, 4));
  const args = ["-input", inputPath, "-results", outputBase, "-json", ...scraperExtraArgs({ depth: options.depth })];
  const { code, stderr } = await spawnScraper(bin, args, perQueryTimeout, resultsDir);

  if (code !== 0) {
    const detail = stderr.trim().slice(0, 800);
    const playwrightHint =
      /could not install|playwright|ms-playwright-go/i.test(stderr)
        ? " Install browsers for the Go scraper: go run github.com/playwright-community/playwright-go/cmd/playwright@latest install --with-deps — then run the scraper once in Terminal before using the app."
        : "";
    throw new MapsScraperError(
      detail
        ? `Google Maps scraper exited with code ${code}: ${detail}${playwrightHint}`
        : `Google Maps scraper exited with code ${code}${playwrightHint}`,
    );
  }

  try {
    return await readOutputRows(outputBase);
  } catch (e) {
    if (e instanceof MapsScraperError) throw e;
    throw new MapsScraperError(`Output parse failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

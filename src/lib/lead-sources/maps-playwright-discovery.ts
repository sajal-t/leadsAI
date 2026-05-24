/**
 * Optional headless Chromium session on Google Maps search results.
 *
 * **Important:** Automating Google Maps may violate Google’s terms, can be blocked (CAPTCHA),
 * and selectors break without notice. Use only on infrastructure you control; enable with
 * `MAPS_BROWSER_DISCOVERY=true` and install browsers: `npx playwright install chromium`.
 */
import type { RawLead } from "./types";
import { isRealBusinessWebsite } from "./website-detection";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function dismissCookieConsent(page: import("playwright").Page): Promise<void> {
  const tryClick = async (name: RegExp) => {
    const b = page.getByRole("button", { name });
    if ((await b.count()) === 0) return false;
    await b.first().click({ timeout: 3000 });
    return true;
  };
  await tryClick(/reject all/i).catch(() => false);
  await tryClick(/accept all/i).catch(() => false);
}

function mapsBrowserMaxPlaces(): number {
  const n = Number(process.env.MAPS_BROWSER_MAX_PLACES ?? "22");
  return Math.min(60, Math.max(5, Number.isFinite(n) && n > 0 ? Math.floor(n) : 22));
}

export async function discoverFromGoogleMapsPlaywright(niche: string, city: string): Promise<RawLead[]> {
  if (process.env.MAPS_BROWSER_DISCOVERY !== "true") return [];

  const query = `${niche.trim()} in ${city.trim()}`;
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  const maxPlaces = mapsBrowserMaxPlaces();

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    locale: "en-US",
  });
  const page = await context.newPage();

  try {
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await dismissCookieConsent(page);
    await sleep(1200);

    const feed = page.locator('div[role="feed"]');
    if ((await feed.count()) === 0) {
      console.warn("[maps-playwright] no results feed; Maps layout may have changed or access blocked.");
      return [];
    }

    for (let i = 0; i < 8; i++) {
      await feed.evaluate((el) => {
        el.scrollTop += 900;
      });
      await sleep(450);
    }

    const placeUrls = await page.evaluate(() => {
      const out: string[] = [];
      const seen = new Set<string>();
      for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href*="/maps/place/"]')) {
        const href = a.href || "";
        const base = href.split("&")[0]?.split("?")[0] ?? href;
        if (!base.includes("/maps/place/") || seen.has(base)) continue;
        seen.add(base);
        out.push(base);
      }
      return out;
    });

    const urls = placeUrls.slice(0, maxPlaces);
    const leads: RawLead[] = [];

    for (const placeUrl of urls) {
      try {
        await page.goto(placeUrl, { waitUntil: "domcontentloaded", timeout: 35_000 });
        await sleep(700);

        const name =
          (await page.locator("h1").first().textContent().catch(() => ""))
            ?.trim()
            .split("\n")[0]
            ?.trim() || "Unknown business";

        let websiteUrl: string | undefined;
        const webLink = page.getByRole("link", { name: /website/i }).first();
        if ((await webLink.count()) > 0) {
          const href = await webLink.getAttribute("href");
          if (href?.startsWith("http") && isRealBusinessWebsite(href)) websiteUrl = href;
        }
        if (!websiteUrl) {
          const auth = page.locator('a[data-item-id="authority"]').first();
          if ((await auth.count()) > 0) {
            const href = await auth.getAttribute("href");
            if (href?.startsWith("http") && isRealBusinessWebsite(href)) websiteUrl = href;
          }
        }
        if (!websiteUrl) {
          const hrefs = await page.$$eval(
            'a[href^="http"]',
            (as) => as.map((a) => (a as HTMLAnchorElement).href),
          );
          for (const href of hrefs) {
            const lower = href.toLowerCase();
            if (
              isRealBusinessWebsite(href) &&
              !lower.includes("google.com") &&
              !lower.includes("gstatic.com") &&
              !lower.includes("googleusercontent.com")
            ) {
              websiteUrl = href;
              break;
            }
          }
        }

        let phone: string | undefined;
        const copyPhone = page.getByRole("button", { name: /copy phone number/i }).first();
        if ((await copyPhone.count()) > 0) {
          const data = await copyPhone.getAttribute("data-item-id");
          if (data?.startsWith("phone:tel:")) {
            phone = decodeURIComponent(data.slice("phone:tel:".length)).slice(0, 40);
          }
        }

        leads.push({
          source: "playwright_maps",
          sourceUrl: placeUrl,
          name,
          category: niche,
          googleMapsUrl: placeUrl,
          websiteUrl,
          phone,
          rawData: { mapsPlaywright: true, searchQuery: query },
        });
      } catch (e) {
        console.warn("[maps-playwright] listing skipped", e instanceof Error ? e.message : e);
      }
      await sleep(450);
    }

    return leads;
  } finally {
    await context.close();
    await browser.close();
  }
}

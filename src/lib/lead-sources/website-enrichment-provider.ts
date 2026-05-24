import { isRealBusinessWebsite } from "./website-detection";

export type EnrichmentResult = {
  homepageOk: boolean;
  emails: string[];
  phones: string[];
  hasContactForm: boolean;
  hasBookingLink: boolean;
  hasTitle: boolean;
  hasMetaDescription: boolean;
  schemaLocalBusiness: boolean;
  https: boolean;
  /** 0–100 */
  qualityScore: number;
  copyrightYear?: number;
};

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /\+?\d[\d\s().-]{8,}\d/g;

function extractJsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      out.push(JSON.parse(m[1]!.trim()));
    } catch {
      /* skip */
    }
  }
  return out;
}

function walkJsonLd(node: unknown, fn: (o: Record<string, unknown>) => void): void {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const x of node) walkJsonLd(x, fn);
    return;
  }
  if (typeof node === "object") {
    const o = node as Record<string, unknown>;
    fn(o);
    for (const v of Object.values(o)) walkJsonLd(v, fn);
  }
}

export async function enrichFromWebsiteUrl(url: string): Promise<EnrichmentResult> {
  const empty: EnrichmentResult = {
    homepageOk: false,
    emails: [],
    phones: [],
    hasContactForm: false,
    hasBookingLink: false,
    hasTitle: false,
    hasMetaDescription: false,
    schemaLocalBusiness: false,
    https: false,
    qualityScore: 0,
  };

  if (!isRealBusinessWebsite(url)) return empty;

  let finalUrl = url;
  if (!/^https?:\/\//i.test(finalUrl)) finalUrl = `https://${finalUrl}`;

  let res: Response;
  try {
    res = await fetch(finalUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent": "LocalLeadAI/1.0 (+https://locallead.ai)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch {
    return { ...empty, homepageOk: false };
  }

  if (!res.ok) return { ...empty, homepageOk: false };

  const html = await res.text();
  const lower = html.toLowerCase();
  const emails = [...html.matchAll(EMAIL_RE)].map((m) => m[0]).filter((e) => !e.endsWith(".png"));
  const phones = [...html.matchAll(PHONE_RE)].map((m) => m[0].replace(/\s+/g, " ").trim());

  const hasTitle = /<title[^>]*>[^<]{3,}<\/title>/i.test(html);
  const hasMetaDescription = /name=["']description["'][^>]*content=["'][^"']{10,}/i.test(html);
  const hasContactForm = /<form[^>]+action=["'][^"']*contact[^"']*["']/i.test(html) || lower.includes('type="email"');
  const hasBookingLink =
    /https?:\/\/[^\s"'<>]+(calendly|book|schedule|appoint|acuity|squareup\/appointments)[^\s"'<>]*/i.test(html) ||
    lower.includes("book now") ||
    lower.includes("schedule online");

  let schemaLocalBusiness = false;
  for (const block of extractJsonLdBlocks(html)) {
    walkJsonLd(block, (o) => {
      const t = o["@type"];
      const types = Array.isArray(t) ? t : t != null ? [String(t)] : [];
      if (types.some((x) => /LocalBusiness|Organization|Dentist|ProfessionalService/i.test(String(x)))) {
        schemaLocalBusiness = true;
      }
    });
  }

  const https = /^https:\/\//i.test(res.url);
  let copyrightYear: number | undefined;
  const cr = html.match(/©\s*(20\d{2})/i) ?? html.match(/copyright\s*(20\d{2})/i);
  if (cr?.[1]) copyrightYear = Number(cr[1]);

  let score = 0;
  if (https) score += 15;
  if (hasTitle) score += 10;
  if (hasMetaDescription) score += 10;
  if (schemaLocalBusiness) score += 15;
  if (hasContactForm) score += 15;
  if (hasBookingLink) score += 15;
  if (/viewport/i.test(html)) score += 10;
  if (copyrightYear != null && copyrightYear < new Date().getFullYear() - 4) score -= 10;

  score = Math.max(0, Math.min(100, score));

  return {
    homepageOk: true,
    emails: [...new Set(emails)].slice(0, 5),
    phones: [...new Set(phones)].slice(0, 5),
    hasContactForm,
    hasBookingLink,
    hasTitle,
    hasMetaDescription,
    schemaLocalBusiness,
    https,
    qualityScore: score,
    copyrightYear,
  };
}

export async function enrichFromExtraPaths(baseUrl: string): Promise<Partial<EnrichmentResult>> {
  let origin: URL;
  try {
    origin = new URL(baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`);
  } catch {
    return {};
  }
  const paths = ["/contact", "/about", "/services", "/team", "/booking"];
  const emails = new Set<string>();
  for (const p of paths) {
    try {
      const u = new URL(p, origin);
      const r = await fetch(u.toString(), {
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "LocalLeadAI/1.0 (+https://locallead.ai)", Accept: "text/html" },
      });
      if (!r.ok) continue;
      const t = await r.text();
      for (const m of t.matchAll(EMAIL_RE)) emails.add(m[0]);
    } catch {
      /* skip path */
    }
  }
  return { emails: [...emails].slice(0, 5) };
}

type BusinessRow = {
  name: string;
  address: string;
  phone: string | null;
  rating: number | null;
  review_count: number | null;
  website_status: string;
};

type CampaignRow = {
  niche: string;
  city: string;
};

const SYSTEM_PROMPT = `You are an expert frontend developer and conversion-focused web designer. You generate clean, modern, responsive static websites for local businesses. You only output valid JSON. Do not wrap the JSON in markdown. Do not include explanations. Do not invent fake owner names, fake awards, fake certifications, fake testimonials, or guaranteed results.`;

export function buildBusinessSitePrompt(business: BusinessRow, campaign: CampaignRow | null): { systemPrompt: string; userPrompt: string } {
  const niche = campaign?.niche ?? "Local business";
  const city = campaign?.city ?? "";

  const userPrompt = `Generate a polished one-page website preview for a local business.

This website is being generated inside LocalLead AI, a tool for web design agencies. The goal is to create a realistic preview that can be sent to the business owner after a cold call.

Business information:
- Business name: ${business.name}
- Industry/niche: ${niche}
- City/location: ${city}
- Address: ${business.address}
- Phone: ${business.phone ?? ""}
- Rating: ${business.rating ?? ""}
- Review count: ${business.review_count ?? ""}
- Website status: ${business.website_status}

Important rules:
- Return valid JSON only.
- Do not use markdown.
- Do not include comments outside the JSON.
- Generate complete static website files.
- Include index.html.
- Include style.css if custom styling is needed.
- Include script.js only if needed.
- The website must be mobile responsive.
- The design should look modern, trustworthy, and specific to the industry.
- Do not invent exact owner names.
- Do not invent awards, certifications, years in business, or testimonials.
- Do not guarantee SEO rankings, revenue, or customer growth.
- Use only the business information provided.
- Generic industry-safe services are okay if phrased generally.
- Make the website feel like a strong sales mockup, not a fake final site.

Website sections:
1. Hero section
2. Services section
3. About section
4. Why choose us section
5. Contact section
6. Clear call-to-action

Return exactly this JSON shape:

{
  "project_name": "string",
  "files": [
    {
      "path": "index.html",
      "language": "html",
      "content": "string"
    },
    {
      "path": "style.css",
      "language": "css",
      "content": "string"
    },
    {
      "path": "script.js",
      "language": "javascript",
      "content": "string"
    }
  ]
}

The index.html should reference style.css and script.js if those files exist.`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

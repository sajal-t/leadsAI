export const DEEPSITE_FULL_HTML_SYSTEM_PROMPT = `You are an expert frontend developer and conversion-focused web designer. Generate exactly one complete self-contained HTML document. Use HTML, CSS, and JavaScript only. You may use Tailwind via CDN if useful. Do not return markdown. Do not explain. Start the response with <!DOCTYPE html>. The site must be polished, responsive, modern, and realistic. Do not invent fake owner names, fake awards, fake certifications, fake testimonials, or guaranteed results.`;

export type DeepsiteFullHtmlVars = {
  business_name: string;
  niche: string;
  city: string;
  address: string;
  phone: string;
  rating: string;
  review_count: string;
  website_status: string;
};

export function buildDeepsiteFullHtmlUserPrompt(vars: DeepsiteFullHtmlVars): string {
  return `Generate a polished one-page website preview for this local business.

This website is being generated inside LeadForge, a sales tool for web design agencies. The goal is to create a realistic preview that can be sent to the business owner after a cold call.

Business information:
- Business name: ${vars.business_name}
- Industry/niche: ${vars.niche}
- City/location: ${vars.city}
- Address: ${vars.address}
- Phone: ${vars.phone}
- Rating: ${vars.rating}
- Review count: ${vars.review_count}
- Website status: ${vars.website_status}

Rules:
- Return exactly one complete HTML document.
- Start with <!DOCTYPE html>.
- Include all CSS inside the document (e.g. <style> or Tailwind CDN).
- Include JavaScript only if needed, inside <script> tags.
- Make it mobile responsive.
- Make the design look modern, trustworthy, and specific to the industry.
- Do not invent owner names, awards, certifications, years in business, or testimonials.
- Do not guarantee revenue, SEO rankings, or customer growth.
- Use only the business information provided.
- Generic industry-safe services are allowed if phrased generally.
- Include these sections:
  1. Hero
  2. Services
  3. About
  4. Why choose us
  5. Contact
  6. Strong call-to-action

You may load Tailwind from:
<script src="https://cdn.tailwindcss.com"></script>

Output the HTML only. No markdown fences.`;
}

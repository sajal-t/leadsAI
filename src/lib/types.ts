export const CALL_OUTCOMES = [
  "no_answer",
  "voicemail",
  "wrong_number",
  "interested",
  "send_info",
  "callback",
  "meeting_booked",
  "not_interested",
  "already_has_someone",
  "too_expensive",
  "does_not_need_website",
  "closed_won",
  "closed_lost",
  "other",
] as const;

export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export type WebsiteStatus = "NO_WEBSITE_FOUND" | "WEBSITE_FOUND" | "UNKNOWN";

export type SiteSpec = {
  business_name: string;
  industry: string;
  city: string;
  theme: {
    style: string;
    primary_color: string;
  };
  hero: {
    headline: string;
    subheadline: string;
    cta: string;
  };
  services: {
    title: string;
    items: { name: string; description: string }[];
  };
  about: {
    title: string;
    body: string;
  };
  why_choose_us: {
    title: string;
    points: string[];
  };
  contact: {
    phone: string;
    address: string;
    cta: string;
  };
};

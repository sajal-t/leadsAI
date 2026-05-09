import { z } from "zod";

export const siteSpecSchema = z.object({
  business_name: z.string(),
  industry: z.string(),
  city: z.string(),
  theme: z.object({
    style: z.string(),
    primary_color: z.string(),
  }),
  hero: z.object({
    headline: z.string(),
    subheadline: z.string(),
    cta: z.string(),
  }),
  services: z.object({
    title: z.string(),
    items: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
      }),
    ),
  }),
  about: z.object({
    title: z.string(),
    body: z.string(),
  }),
  why_choose_us: z.object({
    title: z.string(),
    points: z.array(z.string()),
  }),
  contact: z.object({
    phone: z.string(),
    address: z.string(),
    cta: z.string(),
  }),
});

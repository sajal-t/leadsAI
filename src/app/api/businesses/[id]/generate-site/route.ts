import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";
import { jsonCompletion } from "@/lib/openai";
import { siteSpecSchema } from "@/lib/site-spec";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserOr401();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const db = dbAdmin();
  const { data: business } = await db.from("businesses").select("*").eq("id", id).eq("user_id", auth.user.id).single();
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const prompt = `Generate a structured website content spec for a local business that does not have a website found. Do not generate HTML. Return valid JSON only. The site should be professional, specific to the niche, and useful as a sales mockup. Use only information provided. Do not invent exact owner names, certifications, awards, or services unless they are common for the industry and written generally.
Business name: ${business.name}
City: ${business.address}
Phone: ${business.phone ?? ""}
Address: ${business.address ?? ""}`;

  const siteSpec = await jsonCompletion(prompt);
  const parsed = siteSpecSchema.safeParse(siteSpec);
  if (!parsed.success) return NextResponse.json({ error: "Invalid site spec from model" }, { status: 400 });

  const previewSlug = `${business.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 35)}-${crypto.randomUUID().slice(0, 8)}`;
  const { data, error } = await db
    .from("generated_sites")
    .insert({
      business_id: id,
      user_id: auth.user.id,
      site_spec_json: parsed.data,
      preview_slug: previewSlug,
      status: "preview_ready",
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    ...data,
    previewUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/preview/${previewSlug}`,
  });
}

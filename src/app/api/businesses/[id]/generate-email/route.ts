import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";
import { jsonCompletion } from "@/lib/openai";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserOr401();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const db = dbAdmin();
  const [{ data: business }, { data: callLogs }, { data: sites }] = await Promise.all([
    db.from("businesses").select("*").eq("id", id).eq("user_id", auth.user.id).single(),
    db.from("call_logs").select("*").eq("business_id", id).eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(1),
    db.from("generated_sites").select("*").eq("business_id", id).eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(1),
  ]);
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const siteUrl = sites?.[0]?.preview_slug
    ? `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/preview/${sites[0].preview_slug}`
    : "No preview yet";

  const prompt = `Write a short follow-up email from a web design agency to a local business. The business has no website found. The user may have spoken to them or left a voicemail. Mention the website preview link if available. Keep the email concise, friendly, and specific to the business. Do not sound spammy. Include a simple opt-out sentence at the end. Return valid JSON only.
Business: ${business.name}
Address: ${business.address}
Latest call outcome: ${callLogs?.[0]?.outcome ?? "unknown"}
Preview link: ${siteUrl}`;

  const emailJson = await jsonCompletion(prompt);
  const { data, error } = await db
    .from("generated_emails")
    .insert({
      business_id: id,
      user_id: auth.user.id,
      subject: emailJson.subject,
      body: emailJson.body,
      status: "draft",
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

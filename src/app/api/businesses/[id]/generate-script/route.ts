import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";
import { jsonCompletion } from "@/lib/openai";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserOr401();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const db = dbAdmin();

  const [{ data: business }, { data: profile }] = await Promise.all([
    db.from("businesses").select("*").eq("id", id).eq("user_id", auth.user.id).single(),
    db.from("profiles").select("*").eq("id", auth.user.id).single(),
  ]);
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const prompt = `Create a natural cold-call script for a web design agency calling a local business. The business has no website found in its Google listing. Keep the tone casual, confident, and not spammy. The goal is to ask whether they would be open to seeing a quick website mockup. Use the business name, niche, city, rating, phone, and address if available. Return valid JSON only.
Business: ${business.name}
City: ${business.address}
Rating: ${business.rating ?? "N/A"}
Phone: ${business.phone ?? "N/A"}
Address: ${business.address ?? "N/A"}
Agency: ${profile?.agency_name ?? "Agency"}`;

  const scriptJson = await jsonCompletion(prompt);
  const { data, error } = await db
    .from("generated_scripts")
    .insert({ business_id: id, user_id: auth.user.id, script_json: scriptJson })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

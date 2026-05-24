import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserOr401();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const db = dbAdmin();
  const [business, calls, script, site] = await Promise.all([
    db.from("businesses").select("*").eq("id", id).eq("user_id", auth.user.id).single(),
    db.from("call_logs").select("*").eq("business_id", id).eq("user_id", auth.user.id).order("created_at", { ascending: false }),
    db.from("generated_scripts").select("*").eq("business_id", id).eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(1),
    db.from("generated_sites").select("*").eq("business_id", id).eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(1),
  ]);
  return NextResponse.json({
    business: business.data,
    call_logs: calls.data ?? [],
    generated_script: script.data?.[0] ?? null,
    generated_site: site.data?.[0] ?? null,
  });
}

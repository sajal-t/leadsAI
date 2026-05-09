import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserOr401();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const db = dbAdmin();
  const { data, error } = await db
    .from("businesses")
    .select("*")
    .eq("campaign_id", id)
    .eq("user_id", auth.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

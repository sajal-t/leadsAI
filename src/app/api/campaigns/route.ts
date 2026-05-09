import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";

const schema = z.object({
  niche: z.string().min(1),
  city: z.string().min(1),
  radius: z.number().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;
  const body = schema.parse(await request.json());
  const db = dbAdmin();

  // Ensure profile exists before inserting rows that reference profiles(id).
  await db.from("profiles").upsert({
    id: auth.user.id,
    email: auth.user.email ?? null,
  });

  const { data, error } = await db
    .from("campaigns")
    .insert({ user_id: auth.user.id, ...body })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

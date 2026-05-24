import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { clearUserWorkspace } from "@/lib/clear-workspace";
import { dbAdmin } from "@/lib/db";

export async function POST(request: Request) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;

  const body = (await request.json().catch(() => ({}))) as { confirm?: string };
  if (body.confirm !== "CLEAR") {
    return NextResponse.json(
      { error: 'Send { "confirm": "CLEAR" } to delete all campaigns, leads, calls, and related data.' },
      { status: 400 },
    );
  }

  try {
    const result = await clearUserWorkspace(dbAdmin(), auth.user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to clear workspace" },
      { status: 500 },
    );
  }
}

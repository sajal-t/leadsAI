import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { loadStudioPayload } from "@/lib/studio-load";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;
  const { id: projectId } = await params;

  const payload = await loadStudioPayload(projectId, auth.user.id);
  if (!payload) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json(payload);
}

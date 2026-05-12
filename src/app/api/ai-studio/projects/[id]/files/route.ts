import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";

const ALLOWED_ROOT = new Set(["index.html", "style.css", "styles.css", "script.js", "main.js"]);

function isAllowedPath(path: string): boolean {
  if (!path || path.includes("..") || path.startsWith("/") || path.includes("\\")) return false;
  if (ALLOWED_ROOT.has(path)) return true;
  if (path.startsWith("assets/")) {
    const rest = path.slice("assets/".length);
    if (!rest || rest.includes("..")) return false;
    return /^[a-zA-Z0-9._/-]+$/.test(rest);
  }
  return false;
}

const bodySchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;
  const { id: projectId } = await params;
  const db = dbAdmin();

  const { data: project, error: pErr } = await db
    .from("ai_site_projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", auth.user.id)
    .single();

  if (pErr || !project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isAllowedPath(body.path)) {
    return NextResponse.json({ error: "File path is not allowed." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: existing } = await db.from("ai_site_files").select("id").eq("project_id", projectId).eq("path", body.path).maybeSingle();

  if (existing?.id) {
    const { error } = await db
      .from("ai_site_files")
      .update({ content: body.content, updated_at: now })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: "File save failed." }, { status: 500 });
  } else {
    const lang =
      body.path.endsWith(".html") ? "html" : body.path.endsWith(".css") ? "css" : body.path.endsWith(".js") ? "javascript" : "text";
    const { error } = await db.from("ai_site_files").insert({
      project_id: projectId,
      path: body.path,
      language: lang,
      content: body.content,
      updated_at: now,
    });
    if (error) return NextResponse.json({ error: "File save failed." }, { status: 500 });
  }

  await db.from("ai_site_projects").update({ updated_at: now }).eq("id", projectId);

  return NextResponse.json({ ok: true, path: body.path, updated_at: now });
}

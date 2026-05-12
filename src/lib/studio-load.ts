import { dbAdmin } from "@/lib/db";
import type { AiWebsiteFile } from "@/lib/ai/parse-website-files";

export type StudioMessage = { id: string; role: string; content: string; created_at: string };

export type StudioPayload = {
  project: { id: string; name: string; business_id: string; user_id: string; created_at: string; updated_at: string };
  business: { id: string; name: string } | null;
  files: AiWebsiteFile[];
  messages: StudioMessage[];
  preview_slug: string | null;
};

export async function loadStudioPayload(projectId: string, userId: string): Promise<StudioPayload | null> {
  const db = dbAdmin();
  const { data: project, error: pErr } = await db
    .from("ai_site_projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();

  if (pErr || !project) return null;

  const [{ data: fileRows }, { data: messageRows }, { data: business }, { data: site }] = await Promise.all([
    db.from("ai_site_files").select("path,language,content,updated_at").eq("project_id", projectId).order("path"),
    db.from("ai_site_messages").select("id,role,content,created_at").eq("project_id", projectId).order("created_at", { ascending: true }),
    db.from("businesses").select("id,name").eq("id", project.business_id).single(),
    db.from("generated_sites").select("preview_slug").eq("ai_site_project_id", projectId).maybeSingle(),
  ]);

  const files: AiWebsiteFile[] = (fileRows ?? []).map((f) => ({
    path: f.path,
    language: f.language,
    content: f.content,
  }));

  return {
    project,
    business: business ?? null,
    files,
    messages: (messageRows ?? []) as StudioMessage[],
    preview_slug: site?.preview_slug ?? null,
  };
}

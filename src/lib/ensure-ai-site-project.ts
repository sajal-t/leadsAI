import { dbAdmin } from "@/lib/db";

type Db = ReturnType<typeof dbAdmin>;

export async function ensureAiSiteProjectForBusiness(
  db: Db,
  businessId: string,
  userId: string,
): Promise<{ ok: true; projectId: string } | { ok: false; errorMessage: string }> {
  const { data: existingProject } = await db
    .from("ai_site_projects")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingProject?.id) {
    return { ok: true, projectId: existingProject.id };
  }

  const { data: created, error: pErr } = await db
    .from("ai_site_projects")
    .insert({
      user_id: userId,
      business_id: businessId,
      name: "Business Website Preview",
    })
    .select("id")
    .single();

  if (pErr || !created) {
    return {
      ok: false,
      errorMessage: "Could not create AI studio project. Run database migration 004 if this persists.",
    };
  }
  return { ok: true, projectId: created.id };
}

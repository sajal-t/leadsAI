import type { SupabaseClient } from "@supabase/supabase-js";

export type ClearWorkspaceResult = {
  campaignsDeleted: number;
  searchQueriesDeleted: number;
  apiUsageDeleted: number;
};

/**
 * Deletes the user's workspace data (campaigns cascade to businesses, calls, deals, etc.).
 * Does not delete the auth account or profile row.
 */
export async function clearUserWorkspace(
  db: SupabaseClient,
  userId: string,
): Promise<ClearWorkspaceResult> {
  const [campaignsRes, searchRes, usageRes] = await Promise.all([
    db.from("campaigns").delete({ count: "exact" }).eq("user_id", userId),
    db.from("search_queries").delete({ count: "exact" }).eq("user_id", userId),
    db.from("api_usage").delete({ count: "exact" }).eq("user_id", userId),
  ]);

  if (campaignsRes.error) throw new Error(campaignsRes.error.message);
  if (searchRes.error) throw new Error(searchRes.error.message);
  if (usageRes.error) throw new Error(usageRes.error.message);

  return {
    campaignsDeleted: campaignsRes.count ?? 0,
    searchQueriesDeleted: searchRes.count ?? 0,
    apiUsageDeleted: usageRes.count ?? 0,
  };
}
